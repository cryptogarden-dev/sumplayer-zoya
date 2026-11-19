import "server-only";
import { Decimal } from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/server/api-auth";
import { BASE_UNIT_BY_FAMILY, DeletionBlockedError } from "@/lib/domain";
import { calculateSubtotal } from "@/lib/domain/pricing/subtotal";
import { calculatePricePerBaseUnit } from "@/lib/domain/pricing/unit-price";
import type { ProductInput } from "@/lib/validation/product";
import type { Prisma } from "@generated/prisma/client";

export interface ProductListFilters {
  q?: string;
  categoryId?: string;
  includeInactive?: boolean;
}

export async function listProducts(businessId: string, filters: ProductListFilters = {}) {
  const where: Prisma.ProductWhereInput = {
    businessId,
    isActive: filters.includeInactive ? undefined : true,
  };

  if (filters.q) {
    where.OR = [
      { productName: { contains: filters.q, mode: "insensitive" } },
      { sku: { contains: filters.q, mode: "insensitive" } },
      { barcode: { contains: filters.q, mode: "insensitive" } },
      { brand: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  return prisma.product.findMany({
    where,
    orderBy: { productName: "asc" },
    include: {
      category: true,
      _count: { select: { supplierProducts: true } },
      // Hanya id supplier dari penawaran AKTIF - dipakai untuk filter
      // "produk dari supplier X" di sisi klien (halaman Produk bergaya
      // marketplace) tanpa perlu query terpisah per produk. Sekalian ambil
      // harga TERBARU tiap penawaran (permintaan pengguna 2026-08-21) untuk
      // ditampilkan sebagai "Mulai Rp..." di kartu produk, pengganti SKU
      // yang cuma kode internal (tidak berguna buat yang mau belanja).
      supplierProducts: {
        where: { isActive: true },
        select: {
          supplierId: true,
          // Isi kemasan + status pajak dipakai untuk menghitung harga beli
          // termurah PER SATUAN DASAR di kartu produk (perbaikan #5).
          totalPackageContent: true,
          // Rincian kemasan dipakai halaman Stok Toko untuk harga jual
          // per kemasan (mis. bungkus 250 gram) dari penawaran termurah,
          // dan jenis kemasan dipakai untuk satuan tampil (mis. Renceng
          // untuk Susu Bendera — lihat displayUnitLabel).
          itemsPerPackage: true,
          contentPerItem: true,
          contentUnit: true,
          packageType: true,
          prices: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              pricePerPackage: true,
              taxStatus: true,
              taxRateValueSnapshot: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Kategori beserta jumlah produk AKTIF di dalamnya - dipakai untuk chip
 * filter bergaya marketplace pada halaman Produk (menunjukkan jumlah tanpa
 * query tambahan per kategori).
 */
export async function listProductCategoriesWithCounts(businessId: string) {
  return prisma.productCategory.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
}

export async function getProductById(businessId: string, id: string) {
  return prisma.product.findFirst({
    where: { id, businessId },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
}

/**
 * `baseUnit` SELALU diturunkan dari `unitFamily` lewat mesin konversi
 * Tahap 2 (`BASE_UNIT_BY_FAMILY`) - tidak pernah diterima sebagai input
 * bebas dari klien (R02: "jenis satuan pembanding menentukan satuan
 * dasar yang valid").
 */
function resolveBaseUnit(input: ProductInput) {
  return BASE_UNIT_BY_FAMILY[input.unitFamily];
}

export async function createProduct(businessId: string, userId: string, input: ProductInput) {
  return prisma.product.create({
    data: {
      businessId,
      sku: input.sku,
      barcode: input.barcode ?? null,
      productName: input.productName,
      brand: input.brand ?? null,
      variant: input.variant ?? null,
      categoryId: input.categoryId ?? null,
      photoUrl: input.photoUrl ?? null,
      unitFamily: input.unitFamily,
      baseUnit: resolveBaseUnit(input),
      notes: input.notes ?? null,
      sellPricePerBaseUnit: input.sellPricePerBaseUnit ?? null,
      eceranPricePerBaseUnit: input.eceranPricePerBaseUnit ?? null,
      createdById: userId,
    },
  });
}

export async function updateProduct(businessId: string, id: string, input: ProductInput) {
  const result = await prisma.product.updateMany({
    where: { id, businessId },
    data: {
      sku: input.sku,
      barcode: input.barcode ?? null,
      productName: input.productName,
      brand: input.brand ?? null,
      variant: input.variant ?? null,
      categoryId: input.categoryId ?? null,
      photoUrl: input.photoUrl ?? null,
      unitFamily: input.unitFamily,
      baseUnit: resolveBaseUnit(input),
      notes: input.notes ?? null,
      // Stok hanya diubah bila klien mengirimnya (form edit) — form lain
      // yang tidak mengirim field ini tidak akan menimpa stok yang ada.
      ...(input.stockQty !== undefined ? { stockQty: input.stockQty } : {}),
      ...(input.lowStockThreshold !== undefined
        ? { lowStockThreshold: input.lowStockThreshold }
        : {}),
      // Harga jual: pola yang sama — hanya diubah bila klien mengirimnya.
      ...(input.sellPricePerBaseUnit !== undefined
        ? { sellPricePerBaseUnit: input.sellPricePerBaseUnit }
        : {}),
      // Harga jual eceran: pola yang sama (Stok Fleksibel 2026-11-19).
      ...(input.eceranPricePerBaseUnit !== undefined
        ? { eceranPricePerBaseUnit: input.eceranPricePerBaseUnit }
        : {}),
    },
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.product.findFirst({ where: { id, businessId } });
}

export async function setProductActive(businessId: string, id: string, isActive: boolean) {
  const result = await prisma.product.updateMany({
    where: { id, businessId },
    data: { isActive },
  });
  return result.count > 0;
}

/**
 * Setel harga jual per satuan dasar saja (fitur "Rekomendasi Jual",
 * 2026-11-13). Dipakai tombol "Pakai sebagai Harga Jual" — sengaja
 * terpisah dari `updateProduct` supaya tidak perlu mengirim ulang seluruh
 * field produk dan tidak menimpa edit form yang belum disimpan.
 */
export async function setSellPrice(
  businessId: string,
  id: string,
  sellPricePerBaseUnit: number | null,
) {
  const result = await prisma.product.updateMany({
    where: { id, businessId },
    data: { sellPricePerBaseUnit },
  });
  return result.count > 0;
}

/**
 * Setel harga jual eceran per satuan dasar saja (Stok Fleksibel,
 * 2026-11-19) — dipakai editor eceran di Stok Toko dan form edit produk.
 * NULL = tidak ada harga eceran; jual per pcs memakai harga jual per
 * satuan dasar.
 */
export async function setEceranPrice(
  businessId: string,
  id: string,
  eceranPricePerBaseUnit: number | null,
) {
  const result = await prisma.product.updateMany({
    where: { id, businessId },
    data: { eceranPricePerBaseUnit },
  });
  return result.count > 0;
}

export interface StockAdjustmentResult {
  /** Stok baru dalam satuan dasar. */
  stockQty: number;
  /** Selisih stok dalam satuan dasar (baru − lama), bertanda. */
  deltaBase: number;
  /** Id baris riwayat yang ditulis, null bila stok tidak berubah. */
  movementId: string | null;
}

/**
 * Setel stok toko ke jumlah baru (satuan dasar) + catat pergerakan
 * PENYESUAIAN di `stock_movements` — dipakai tombol +/- dan input angka
 * di Stok Toko. Stok tidak boleh negatif (ditolak 400). Bila jumlah
 * tidak berubah, tidak ada baris riwayat yang ditulis. Satu transaksi:
 * stok dan riwayat selalu konsisten.
 */
export async function adjustStock(
  businessId: string,
  userId: string,
  productId: string,
  newStockQtyBase: number,
  movement: { unitLabel: string; unitQuantity: number; note?: string },
): Promise<StockAdjustmentResult | null> {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: productId, businessId },
      select: { stockQty: true },
    });
    if (!product) return null;

    const oldQty = new Decimal(product.stockQty);
    const nextQty = new Decimal(newStockQtyBase);
    if (nextQty.isNegative()) {
      throw new ApiError(400, "Stok tidak boleh negatif.");
    }
    const delta = nextQty.minus(oldQty);
    await tx.product.update({
      where: { id: productId },
      data: { stockQty: nextQty },
    });

    let movementId: string | null = null;
    if (!delta.isZero()) {
      const created = await tx.stockMovement.create({
        data: {
          businessId,
          productId,
          type: "PENYESUAIAN",
          quantityDeltaBase: delta,
          unitLabel: movement.unitLabel,
          unitQuantity: new Decimal(movement.unitQuantity),
          note: movement.note ?? null,
          createdById: userId,
        },
      });
      movementId = created.id;
    }

    return {
      stockQty: nextQty.toNumber(),
      deltaBase: delta.toNumber(),
      movementId,
    };
  });
}

export interface SaleInput {
  /** "package" = jual per kemasan termurah, "base" = jual per satuan dasar. */
  unit: "package" | "base";
  /** Jumlah dalam satuan yang dipilih. */
  quantity: number;
  /** Label satuan yang dipilih pengguna (mis. "Renceng" / "pcs"). */
  unitLabel: string;
}

export interface SaleResult {
  /** Stok baru dalam satuan dasar. */
  stockQty: number;
  /** Total penjualan (Rp). */
  totalAmount: number;
  unitLabel: string;
  unitQuantity: number;
  /** Harga per satuan yang dipilih (Rp). */
  unitPrice: number;
}

/**
 * Catat satu penjualan + kurangi stok (Stok Fleksibel, 2026-11-19).
 * Satu transaksi: stok berkurang dan baris PENJUALAN tercatat — tidak
 * bisa ada penjualan tanpa pengurangan stok, dan sebaliknya.
 *
 * Harga dihitung di server dari harga yang tersimpan (bukan dari klien):
 * - per kemasan: harga jual per satuan dasar x isi kemasan termurah;
 * - per satuan dasar: harga eceran bila ada, kalau tidak harga jual
 *   per satuan dasar.
 * Stok berkurang dalam satuan dasar (kemasan x isi), jadi renceng dan
 * pcs memakai satu sistem persediaan yang sama — tidak dihitung dua
 * kali. Stok tidak boleh kurang dari yang dijual (ditolak 400).
 */
export async function recordSale(
  businessId: string,
  userId: string,
  productId: string,
  input: SaleInput,
): Promise<SaleResult | null> {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: productId, businessId },
      include: {
        supplierProducts: {
          where: { isActive: true },
          select: {
            packageType: true,
            totalPackageContent: true,
            prices: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                pricePerPackage: true,
                taxStatus: true,
                taxRateValueSnapshot: true,
              },
            },
          },
        },
      },
    });
    if (!product) return null;
    if (input.quantity <= 0) {
      throw new ApiError(400, "Jumlah jual harus lebih dari 0.");
    }

    // Kemasan jual = penawaran termurah per satuan dasar (aturan yang
    // sama dengan Harga Beli di Stok Toko).
    const pricedOffers = product.supplierProducts.filter((offer) => offer.prices[0]);
    let cheapestOffer: (typeof pricedOffers)[number] | null = null;
    let cheapestPerBaseUnit: ReturnType<typeof calculatePricePerBaseUnit> | null = null;
    for (const offer of pricedOffers) {
      const perBaseUnit = calculatePricePerBaseUnit(
        calculateSubtotal({
          packagesToBuy: 1,
          pricePerPackage: offer.prices[0]!.pricePerPackage,
          taxStatus: offer.prices[0]!.taxStatus,
          taxRatePercent: offer.prices[0]!.taxRateValueSnapshot ?? 0,
        }).pricePerPackageAfterTax,
        offer.totalPackageContent,
      );
      if (cheapestPerBaseUnit === null || perBaseUnit.lessThan(cheapestPerBaseUnit)) {
        cheapestPerBaseUnit = perBaseUnit;
        cheapestOffer = offer;
      }
    }
    const packageContent = cheapestOffer === null ? 1 : Number(cheapestOffer.totalPackageContent);

    const sellPerBase =
      product.sellPricePerBaseUnit === null ? null : Number(product.sellPricePerBaseUnit);
    const eceranPerBase =
      product.eceranPricePerBaseUnit === null ? null : Number(product.eceranPricePerBaseUnit);

    let baseQty: Decimal;
    let unitPrice: Decimal;
    if (input.unit === "package") {
      if (packageContent <= 1) {
        throw new ApiError(400, "Produk ini tidak dijual per kemasan.");
      }
      if (sellPerBase === null) {
        throw new ApiError(400, "Harga jual produk ini belum diatur.");
      }
      baseQty = new Decimal(input.quantity).times(packageContent).toDecimalPlaces(4);
      unitPrice = new Decimal(sellPerBase).times(packageContent);
    } else {
      const baseUnitPrice =
        eceranPerBase !== null
          ? new Decimal(eceranPerBase)
          : sellPerBase !== null
            ? new Decimal(sellPerBase)
            : null;
      if (baseUnitPrice === null) {
        throw new ApiError(400, "Harga jual produk ini belum diatur.");
      }
      unitPrice = baseUnitPrice;
      baseQty = new Decimal(input.quantity).toDecimalPlaces(4);
    }

    const stockQty = new Decimal(product.stockQty);
    if (baseQty.greaterThan(stockQty)) {
      throw new ApiError(400, "Stok tidak cukup untuk penjualan ini.");
    }
    const totalAmount = new Decimal(input.quantity)
      .times(unitPrice)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const nextQty = stockQty.minus(baseQty);

    await tx.product.update({
      where: { id: productId },
      data: { stockQty: nextQty },
    });
    await tx.stockMovement.create({
      data: {
        businessId,
        productId,
        type: "PENJUALAN",
        quantityDeltaBase: baseQty.negated(),
        unitLabel: input.unitLabel,
        unitQuantity: new Decimal(input.quantity),
        unitPrice,
        totalAmount,
        createdById: userId,
      },
    });

    return {
      stockQty: nextQty.toNumber(),
      totalAmount: totalAmount.toNumber(),
      unitLabel: input.unitLabel,
      unitQuantity: input.quantity,
      unitPrice: unitPrice.toNumber(),
    };
  });
}

/**
 * Riwayat pergerakan stok, terbaru dulu — dipakai halaman Penjualan
 * (hanya PENJUALAN) dan riwayat produk. `take` dibatasi 100.
 */
export async function listStockMovements(
  businessId: string,
  filters: { type?: "PENJUALAN" | "PENYESUAIAN"; productId?: string; take?: number } = {},
) {
  return prisma.stockMovement.findMany({
    where: {
      businessId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.productId ? { productId: filters.productId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(filters.take ?? 50, 1), 100),
    include: {
      product: { select: { productName: true } },
      createdBy: { select: { name: true } },
    },
  });
}

/** Ringkasan penjualan: total omzet tercatat + jumlah transaksi. */
export async function getSalesSummary(businessId: string) {
  const aggregate = await prisma.stockMovement.aggregate({
    where: { businessId, type: "PENJUALAN" },
    _sum: { totalAmount: true },
    _count: { _all: true },
  });
  return {
    totalAmount: aggregate._sum.totalAmount?.toNumber() ?? 0,
    count: aggregate._count._all,
  };
}

/**
 * Hapus PERMANEN satu produk (docs/BACKLOG.md #5). Hanya diizinkan jika
 * produk ini belum pernah dipakai di baris pesanan manapun
 * (`purchase_order_items`, dicek lewat relasi `SupplierProduct`) DAN tidak
 * punya penawaran AKTIF (penawaran nonaktif ikut terhapus lewat cascade,
 * itu aman karena tidak pernah dipakai di pesanan). Kalau terhalang, tolak
 * dengan `DeletionBlockedError` yang menyebut nomor pesanan / nama
 * supplier pemblokirnya, dan arahkan pengguna memakai `setProductActive`
 * (nonaktifkan) supaya riwayat pesanan lama tidak ikut terhapus (skema
 * memakai `onDelete: Cascade` dari Produk -> Penawaran -> Baris Pesanan).
 */
export async function deleteProduct(businessId: string, id: string): Promise<boolean> {
  const product = await prisma.product.findFirst({ where: { id, businessId } });
  if (!product) return false;

  // Pesan penolakan menyebut pesanan/penawaran pemblokirnya (bukan
  // sekadar "tidak bisa dihapus"), supaya pengguna tahu apa yang harus
  // dibereskan dulu.
  const blockingOrderItem = await prisma.purchaseOrderItem.findFirst({
    where: { businessId, supplierProduct: { productId: id } },
    include: {
      purchaseOrder: { select: { orderNumber: true } },
      supplierProduct: { include: { supplier: { select: { supplierName: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (blockingOrderItem) {
    throw new DeletionBlockedError(
      `Produk ini masih ada di pesanan ${blockingOrderItem.purchaseOrder.orderNumber ?? "Draft"} ` +
        `(supplier ${blockingOrderItem.supplierProduct.supplier.supplierName}), jadi tidak bisa ` +
        `dihapus permanen (supaya riwayat pesanan lama tidak rusak). Hapus dulu pesanan itu, ` +
        `atau gunakan tombol Nonaktifkan.`,
    );
  }

  const blockingOffer = await prisma.supplierProduct.findFirst({
    where: { businessId, productId: id, isActive: true },
    include: { supplier: { select: { supplierName: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (blockingOffer) {
    throw new DeletionBlockedError(
      `Produk ini masih punya penawaran aktif dari ${blockingOffer.supplier.supplierName}, jadi ` +
        `tidak bisa dihapus permanen. Hapus atau nonaktifkan dulu penawarannya, atau gunakan ` +
        `tombol Nonaktifkan.`,
    );
  }

  await prisma.product.delete({ where: { id } });
  return true;
}

export async function isSkuTaken(businessId: string, sku: string, excludeId?: string) {
  const existing = await prisma.product.findFirst({
    where: { businessId, sku, id: excludeId ? { not: excludeId } : undefined },
    select: { id: true },
  });
  return existing !== null;
}

export async function listProductCategories(businessId: string) {
  return prisma.productCategory.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createProductCategory(businessId: string, name: string) {
  return prisma.productCategory.create({ data: { businessId, name } });
}

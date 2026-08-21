import "server-only";
import { prisma } from "@/lib/db/prisma";
import { resolvePackage, DeletionBlockedError } from "@/lib/domain";
import type {
  PriceTaxInput,
  StockInput,
  SupplierProductDefinitionUpdate,
  SupplierProductInput,
} from "@/lib/validation/supplier-product";
import type { Prisma } from "@generated/prisma/client";

const OFFER_DETAIL_INCLUDE = {
  supplier: { select: { id: true, supplierName: true, city: true, isActive: true } },
  product: {
    select: {
      id: true,
      productName: true,
      sku: true,
      baseUnit: true,
      unitFamily: true,
      brand: true,
      variant: true,
      // Disertakan agar UI penambahan produk pada Pesanan bisa
      // mengelompokkan penawaran per kategori (bukan daftar rata).
      category: { select: { id: true, name: true } },
    },
  },
  prices: { orderBy: { createdAt: "desc" as const }, take: 1, include: { taxRate: true } },
  stock: true,
} satisfies Prisma.SupplierProductInclude;

export type SupplierProductWithDetails = Prisma.SupplierProductGetPayload<{
  include: typeof OFFER_DETAIL_INCLUDE;
}>;

export interface OfferListFilters {
  productId?: string;
  supplierId?: string;
  includeInactive?: boolean;
  /**
   * Kalau `true`, sembunyikan penawaran yang produknya sudah dinonaktifkan
   * (docs/BACKLOG.md #5) - dipakai saat menyusun daftar produk yang BOLEH
   * ditambahkan ke pesanan baru. Default `false` supaya halaman yang
   * memang ingin melihat semua penawaran satu produk tertentu (termasuk
   * saat produk itu sendiri sedang nonaktif, mis. halaman detail produk)
   * tidak berubah perilakunya.
   */
  activeProductOnly?: boolean;
}

/**
 * Include lengkap khusus untuk halaman Bandingkan (Tahap 4, R12): perlu
 * data area/jadwal/ongkir supplier yang TIDAK disertakan pada
 * `OFFER_DETAIL_INCLUDE` (Tahap 3) agar tidak membebani query pada layar
 * lain yang tidak membutuhkannya.
 */
const OFFER_COMPARISON_INCLUDE = {
  supplier: {
    select: {
      id: true,
      supplierName: true,
      province: true,
      city: true,
      district: true,
      address: true,
      latitude: true,
      longitude: true,
      whatsappNumber: true,
      phoneNumber: true,
      contactName: true,
      leadTimeDaysMin: true,
      leadTimeDaysMax: true,
      isActive: true,
      deliveryAreas: true,
      deliverySchedules: true,
      shippingRule: { include: { areas: true } },
    },
  },
  product: {
    select: {
      id: true,
      productName: true,
      sku: true,
      baseUnit: true,
      unitFamily: true,
      isActive: true,
    },
  },
  prices: { orderBy: { createdAt: "desc" as const }, take: 1, include: { taxRate: true } },
  stock: true,
} satisfies Prisma.SupplierProductInclude;

export type OfferForComparison = Prisma.SupplierProductGetPayload<{
  include: typeof OFFER_COMPARISON_INCLUDE;
}>;

/**
 * Seluruh penawaran AKTIF untuk satu produk, dengan data lengkap yang
 * dibutuhkan mesin rekomendasi Tahap 4 (area, jadwal, ongkir, stok, harga
 * terbaru). Hanya menyertakan penawaran dari supplier yang juga aktif —
 * supplier nonaktif tidak relevan untuk pembelian baru.
 */
export async function listOffersForComparison(
  businessId: string,
  productId: string,
): Promise<OfferForComparison[]> {
  return prisma.supplierProduct.findMany({
    // `product: { isActive: true }` (perbaikan bug 2026-08-21, lihat
    // docs/BACKLOG.md #5): tanpa ini, produk yang sudah dinonaktifkan di
    // halaman Produk tetap muncul di hasil Bandingkan selama penawaran &
    // suppliernya sendiri masih aktif.
    where: {
      businessId,
      productId,
      isActive: true,
      supplier: { isActive: true },
      product: { isActive: true },
    },
    include: OFFER_COMPARISON_INCLUDE,
  });
}

export async function listOffers(businessId: string, filters: OfferListFilters = {}) {
  const where: Prisma.SupplierProductWhereInput = {
    businessId,
    isActive: filters.includeInactive ? undefined : true,
  };
  if (filters.productId) where.productId = filters.productId;
  if (filters.supplierId) where.supplierId = filters.supplierId;
  if (filters.activeProductOnly) where.product = { isActive: true };

  return prisma.supplierProduct.findMany({
    where,
    include: OFFER_DETAIL_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function getOfferById(businessId: string, id: string) {
  return prisma.supplierProduct.findFirst({
    where: { id, businessId },
    include: {
      ...OFFER_DETAIL_INCLUDE,
      prices: { orderBy: { createdAt: "desc" }, include: { taxRate: true } },
    },
  });
}

async function resolveTaxRateSnapshot(
  tx: Prisma.TransactionClient,
  businessId: string,
  taxRateId: string | undefined,
) {
  if (!taxRateId) {
    return { taxRateId: null, taxRateValueSnapshot: null };
  }

  const taxRate = await tx.taxRate.findFirst({
    where: { id: taxRateId, businessId, isActive: true },
  });
  if (!taxRate) {
    throw new Error("Tarif pajak tidak ditemukan atau tidak aktif untuk bisnis ini.");
  }

  return { taxRateId: taxRate.id, taxRateValueSnapshot: taxRate.ratePercent };
}

/**
 * Membuat penawaran baru sekaligus entri harga & stok awal (R03).
 * `totalPackageContent` SELALU dihitung ulang di sini memakai
 * `resolvePackage()` (mesin Tahap 2) - nilai dari klien (jika ada) tidak
 * pernah dipakai langsung (Keamanan: "Jangan mempercayai nilai perhitungan
 * dari client").
 */
export async function createOffer(businessId: string, userId: string, input: SupplierProductInput) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({ where: { id: input.supplierId, businessId } });
    if (!supplier) throw new Error("Supplier tidak ditemukan untuk bisnis ini.");

    const product = await tx.product.findFirst({ where: { id: input.productId, businessId } });
    if (!product) throw new Error("Produk tidak ditemukan untuk bisnis ini.");

    const resolved = resolvePackage({
      packagingType: input.packageType,
      itemsPerPackage: input.itemsPerPackage,
      contentPerItem: input.contentPerItem,
      contentUnit: input.contentUnit,
    });

    if (resolved.family !== product.unitFamily) {
      throw new Error(
        `Satuan isi kemasan (${resolved.family}) tidak sesuai dengan jenis satuan pembanding produk (${product.unitFamily}).`,
      );
    }

    const taxSnapshot = await resolveTaxRateSnapshot(tx, businessId, input.price.taxRateId);

    const offer = await tx.supplierProduct.create({
      data: {
        businessId,
        supplierId: input.supplierId,
        productId: input.productId,
        supplierSkuOrName: input.supplierSkuOrName ?? null,
        packageType: input.packageType,
        itemsPerPackage: input.itemsPerPackage,
        contentPerItem: input.contentPerItem,
        contentUnit: input.contentUnit,
        totalPackageContent: resolved.totalContentInBaseUnit.toString(),
        baseUnit: resolved.baseUnit,
        minPurchasePackages: input.minPurchasePackages,
        purchaseMultiplePackages: input.purchaseMultiplePackages,
        estimatedDeliveryDaysMin: input.estimatedDeliveryDaysMin ?? null,
        estimatedDeliveryDaysMax: input.estimatedDeliveryDaysMax ?? null,
        createdById: userId,
      },
    });

    await tx.supplierPrice.create({
      data: {
        businessId,
        supplierProductId: offer.id,
        pricePerPackage: input.price.pricePerPackage,
        taxStatus: input.price.taxStatus,
        taxRateId: taxSnapshot.taxRateId,
        taxRateValueSnapshot: taxSnapshot.taxRateValueSnapshot,
        priceSourceNote: input.price.priceSourceNote ?? null,
        createdById: userId,
      },
    });

    await tx.supplierStock.create({
      data: {
        businessId,
        supplierProductId: offer.id,
        availabilityStatus: input.stock.availabilityStatus,
        stockQty: input.stock.stockQty ?? null,
        updatedById: userId,
      },
    });

    return tx.supplierProduct.findFirst({ where: { id: offer.id }, include: OFFER_DETAIL_INCLUDE });
  });
}

/** Memperbarui definisi kemasan/aturan pembelian penawaran (BUKAN harga). */
export async function updateOfferDefinition(
  businessId: string,
  id: string,
  input: SupplierProductDefinitionUpdate,
) {
  return prisma.$transaction(async (tx) => {
    const offer = await tx.supplierProduct.findFirst({
      where: { id, businessId },
      include: { product: true },
    });
    if (!offer) return null;

    const resolved = resolvePackage({
      packagingType: input.packageType,
      itemsPerPackage: input.itemsPerPackage,
      contentPerItem: input.contentPerItem,
      contentUnit: input.contentUnit,
    });

    if (resolved.family !== offer.product.unitFamily) {
      throw new Error(
        `Satuan isi kemasan (${resolved.family}) tidak sesuai dengan jenis satuan pembanding produk (${offer.product.unitFamily}).`,
      );
    }

    await tx.supplierProduct.update({
      where: { id },
      data: {
        supplierSkuOrName: input.supplierSkuOrName ?? null,
        packageType: input.packageType,
        itemsPerPackage: input.itemsPerPackage,
        contentPerItem: input.contentPerItem,
        contentUnit: input.contentUnit,
        totalPackageContent: resolved.totalContentInBaseUnit.toString(),
        baseUnit: resolved.baseUnit,
        minPurchasePackages: input.minPurchasePackages,
        purchaseMultiplePackages: input.purchaseMultiplePackages,
        estimatedDeliveryDaysMin: input.estimatedDeliveryDaysMin ?? null,
        estimatedDeliveryDaysMax: input.estimatedDeliveryDaysMax ?? null,
      },
    });

    return tx.supplierProduct.findFirst({ where: { id }, include: OFFER_DETAIL_INCLUDE });
  });
}

export async function setOfferActive(businessId: string, id: string, isActive: boolean) {
  const result = await prisma.supplierProduct.updateMany({
    where: { id, businessId },
    data: { isActive },
  });
  return result.count > 0;
}

/**
 * Hapus PERMANEN satu penawaran (docs/BACKLOG.md #5). Hanya diizinkan jika
 * penawaran ini belum pernah dipakai di baris pesanan manapun
 * (`purchase_order_items`) - kalau sudah pernah dipesan, tolak dengan
 * `DeletionBlockedError` dan arahkan pengguna memakai `setOfferActive`
 * (nonaktifkan) supaya riwayat pesanan lama tidak rusak.
 */
export async function deleteOffer(businessId: string, id: string): Promise<boolean> {
  const offer = await prisma.supplierProduct.findFirst({ where: { id, businessId } });
  if (!offer) return false;

  const orderHistoryCount = await prisma.purchaseOrderItem.count({
    where: { businessId, supplierProductId: id },
  });
  if (orderHistoryCount > 0) {
    throw new DeletionBlockedError(
      "Penawaran ini sudah pernah dipesan ke supplier, jadi tidak bisa dihapus permanen (supaya riwayat pesanan lama tidak rusak). Gunakan tombol Nonaktifkan.",
    );
  }

  await prisma.supplierProduct.delete({ where: { id } });
  return true;
}

/**
 * Menambah entri riwayat harga BARU (R20 - append-only). Tidak pernah
 * mengubah/menghapus baris lama - hanya INSERT.
 */
export async function addPriceHistoryEntry(
  businessId: string,
  userId: string,
  supplierProductId: string,
  input: PriceTaxInput,
) {
  return prisma.$transaction(async (tx) => {
    const offer = await tx.supplierProduct.findFirst({
      where: { id: supplierProductId, businessId },
    });
    if (!offer) return null;

    const taxSnapshot = await resolveTaxRateSnapshot(tx, businessId, input.taxRateId);

    return tx.supplierPrice.create({
      data: {
        businessId,
        supplierProductId,
        pricePerPackage: input.pricePerPackage,
        taxStatus: input.taxStatus,
        taxRateId: taxSnapshot.taxRateId,
        taxRateValueSnapshot: taxSnapshot.taxRateValueSnapshot,
        priceSourceNote: input.priceSourceNote ?? null,
        createdById: userId,
      },
      include: { taxRate: true },
    });
  });
}

export async function getPriceHistory(businessId: string, supplierProductId: string) {
  return prisma.supplierPrice.findMany({
    where: { businessId, supplierProductId },
    orderBy: { createdAt: "desc" },
    include: { taxRate: true, createdBy: { select: { id: true, name: true } } },
  });
}

export async function upsertStock(
  businessId: string,
  userId: string,
  supplierProductId: string,
  input: StockInput,
) {
  const offer = await prisma.supplierProduct.findFirst({
    where: { id: supplierProductId, businessId },
  });
  if (!offer) return null;

  return prisma.supplierStock.upsert({
    where: { supplierProductId },
    create: {
      businessId,
      supplierProductId,
      availabilityStatus: input.availabilityStatus,
      stockQty: input.stockQty ?? null,
      updatedById: userId,
    },
    update: {
      availabilityStatus: input.availabilityStatus,
      stockQty: input.stockQty ?? null,
      updatedById: userId,
    },
  });
}

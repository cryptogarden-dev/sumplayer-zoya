import "server-only";
import { prisma } from "@/lib/db/prisma";
import { BASE_UNIT_BY_FAMILY, DeletionBlockedError } from "@/lib/domain";
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
          prices: { orderBy: { createdAt: "desc" }, take: 1, select: { pricePerPackage: true } },
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
 * Hapus PERMANEN satu produk (docs/BACKLOG.md #5). Hanya diizinkan jika
 * produk ini belum pernah dipakai di baris pesanan manapun
 * (`purchase_order_items`, dicek lewat relasi `SupplierProduct`) - kalau
 * sudah pernah dipesan, tolak dengan `DeletionBlockedError` dan arahkan
 * pengguna memakai `setProductActive` (nonaktifkan) supaya riwayat pesanan
 * lama tidak ikut terhapus (skema memakai `onDelete: Cascade` dari Produk
 * -> Penawaran -> Baris Pesanan).
 */
export async function deleteProduct(businessId: string, id: string): Promise<boolean> {
  const product = await prisma.product.findFirst({ where: { id, businessId } });
  if (!product) return false;

  const orderHistoryCount = await prisma.purchaseOrderItem.count({
    where: { businessId, supplierProduct: { productId: id } },
  });
  if (orderHistoryCount > 0) {
    throw new DeletionBlockedError(
      "Produk ini sudah pernah dipesan ke supplier, jadi tidak bisa dihapus permanen (supaya riwayat pesanan lama tidak rusak). Gunakan tombol Nonaktifkan.",
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

import "server-only";
import { Decimal } from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { calculateSubtotal } from "@/lib/domain/pricing/subtotal";
import { getDefaultBusinessLocation } from "@/lib/server/repositories/business-location-repository";
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderItemAvailabilityInput,
  PurchaseOrderItemInput,
} from "@/lib/validation/purchase-order";
import type { PaymentMethod } from "@/lib/domain/orders/types";
import type { Prisma } from "@generated/prisma/client";

/**
 * Pesanan ke satu supplier (R16, pengembangan lanjutan disepakati
 * 2026-08-18 - lihat docs/BACKLOG.md #2). Alur status:
 * DRAFT -> DIPESAN (kirim WA) -> DIKONFIRMASI (metode bayar dipilih,
 * ketersediaan tiap baris sudah ditandai) -> (menyusul, R18) DIKIRIM/
 * DITERIMA. Bisa DIBATALKAN dari DRAFT atau DIPESAN.
 */

const ORDER_DETAIL_INCLUDE = {
  supplier: { select: { id: true, supplierName: true, whatsappNumber: true, phoneNumber: true } },
  location: true,
  items: {
    include: {
      supplierProduct: {
        include: {
          product: { select: { id: true, productName: true, brand: true, variant: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.PurchaseOrderInclude;

export type PurchaseOrderWithDetails = Prisma.PurchaseOrderGetPayload<{
  include: typeof ORDER_DETAIL_INCLUDE;
}>;

export interface PurchaseOrderListFilters {
  status?: string;
  supplierId?: string;
}

export async function listPurchaseOrders(
  businessId: string,
  filters: PurchaseOrderListFilters = {},
) {
  const where: Prisma.PurchaseOrderWhereInput = { businessId };
  if (filters.status) where.status = filters.status as Prisma.PurchaseOrderWhereInput["status"];
  if (filters.supplierId) where.supplierId = filters.supplierId;

  return prisma.purchaseOrder.findMany({
    where,
    include: ORDER_DETAIL_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function getPurchaseOrderById(businessId: string, id: string) {
  return prisma.purchaseOrder.findFirst({
    where: { id, businessId },
    include: ORDER_DETAIL_INCLUDE,
  });
}

/**
 * Baris yang dihitung ke total: `TIDAK_TERSEDIA` = 0, `SEBAGIAN` memakai
 * `confirmedPackageQty` (dihitung ulang dari snapshot harga/pajak, BUKAN
 * proporsi linear dari `lineSubtotal`, agar tetap presisi), selainnya
 * (`BELUM_DIKONFIRMASI`/`TERSEDIA`) memakai `lineSubtotal` yang tersimpan.
 */
export function effectiveLineTotal(
  item: Pick<
    PurchaseOrderWithDetails["items"][number],
    | "availabilityStatus"
    | "confirmedPackageQty"
    | "lineSubtotal"
    | "pricePerPackageSnapshot"
    | "taxStatusSnapshot"
    | "taxRateValueSnapshot"
  >,
): Decimal {
  if (item.availabilityStatus === "TIDAK_TERSEDIA") return new Decimal(0);
  if (item.availabilityStatus === "SEBAGIAN" && item.confirmedPackageQty !== null) {
    return calculateSubtotal({
      packagesToBuy: item.confirmedPackageQty,
      pricePerPackage: item.pricePerPackageSnapshot,
      taxStatus: item.taxStatusSnapshot,
      taxRatePercent: item.taxRateValueSnapshot ?? 0,
    }).subtotalAfterTax;
  }
  return new Decimal(item.lineSubtotal);
}

export function computeOrderTotal(order: PurchaseOrderWithDetails): Decimal {
  return order.items.reduce((sum, item) => sum.plus(effectiveLineTotal(item)), new Decimal(0));
}

/**
 * Membuat draft pesanan kosong untuk satu supplier. `locationId` diisi
 * otomatis dari lokasi default bisnis bila tidak disebutkan secara
 * eksplisit (docs/BACKLOG.md #1 - hindari isi alamat manual berulang).
 */
export async function createDraftPurchaseOrder(
  businessId: string,
  userId: string,
  input: CreatePurchaseOrderInput,
) {
  const locationId = input.locationId ?? (await getDefaultBusinessLocation(businessId))?.id ?? null;

  return prisma.purchaseOrder.create({
    data: {
      businessId,
      supplierId: input.supplierId,
      locationId,
      notes: input.notes ?? null,
      createdById: userId,
    },
    include: ORDER_DETAIL_INCLUDE,
  });
}

class OrderStateError extends Error {}

/**
 * Menambah/menaikkan jumlah baris produk pada draft. Harga & pajak
 * SELALU snapshot dari `SupplierPrice` teraktif milik `supplierProductId`
 * saat panggilan ini (bukan dari klien - Keamanan: "jangan percaya
 * nilai perhitungan dari client"). Jika baris untuk `supplierProductId`
 * yang sama sudah ada di pesanan ini, jumlahnya DITAMBAHKAN (perilaku
 * "keranjang"), bukan membuat baris duplikat.
 */
export async function addPurchaseOrderItem(
  businessId: string,
  orderId: string,
  userId: string,
  input: PurchaseOrderItemInput,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findFirst({ where: { id: orderId, businessId } });
    if (!order) return null;
    if (order.status !== "DRAFT") {
      throw new OrderStateError("Baris produk hanya bisa diubah selama pesanan masih draft.");
    }

    const supplierProduct = await tx.supplierProduct.findFirst({
      where: { id: input.supplierProductId, businessId, supplierId: order.supplierId },
      include: { product: { select: { isActive: true } } },
    });
    if (!supplierProduct) {
      throw new Error("Penawaran produk tidak ditemukan untuk supplier pesanan ini.");
    }
    // Penjagaan di lapis repository (docs/BACKLOG.md #5) - berlaku untuk
    // SEMUA jalur penambahan baris (halaman Pesanan, panel "Pesan" cepat di
    // Produk, dst), bukan cuma satu UI tertentu.
    if (!supplierProduct.product.isActive) {
      throw new Error("Produk ini sudah dinonaktifkan, tidak bisa ditambahkan ke pesanan baru.");
    }

    const latestPrice = await tx.supplierPrice.findFirst({
      where: { supplierProductId: input.supplierProductId },
      orderBy: { createdAt: "desc" },
    });
    if (!latestPrice) {
      throw new Error("Belum ada harga untuk penawaran ini.");
    }

    const existing = await tx.purchaseOrderItem.findFirst({
      where: { purchaseOrderId: orderId, supplierProductId: input.supplierProductId },
    });
    const newQty = new Decimal(existing?.packageQty ?? 0).plus(input.packageQty);
    const subtotal = calculateSubtotal({
      packagesToBuy: newQty,
      pricePerPackage: latestPrice.pricePerPackage,
      taxStatus: latestPrice.taxStatus,
      taxRatePercent: latestPrice.taxRateValueSnapshot ?? 0,
    });

    if (existing) {
      return tx.purchaseOrderItem.update({
        where: { id: existing.id },
        data: {
          packageQty: newQty,
          pricePerPackageSnapshot: latestPrice.pricePerPackage,
          taxStatusSnapshot: latestPrice.taxStatus,
          taxRateValueSnapshot: latestPrice.taxRateValueSnapshot,
          lineSubtotal: subtotal.subtotalAfterTax,
          notes: input.notes ?? existing.notes,
        },
      });
    }

    return tx.purchaseOrderItem.create({
      data: {
        purchaseOrderId: orderId,
        businessId,
        supplierProductId: input.supplierProductId,
        packageQty: newQty,
        pricePerPackageSnapshot: latestPrice.pricePerPackage,
        taxStatusSnapshot: latestPrice.taxStatus,
        taxRateValueSnapshot: latestPrice.taxRateValueSnapshot,
        lineSubtotal: subtotal.subtotalAfterTax,
        notes: input.notes ?? null,
      },
    });
  });
}

export async function updatePurchaseOrderItemQty(
  businessId: string,
  orderId: string,
  itemId: string,
  packageQty: number,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findFirst({ where: { id: orderId, businessId } });
    if (!order) return null;
    if (order.status !== "DRAFT") {
      throw new OrderStateError("Baris produk hanya bisa diubah selama pesanan masih draft.");
    }

    const item = await tx.purchaseOrderItem.findFirst({
      where: { id: itemId, purchaseOrderId: orderId },
    });
    if (!item) return null;

    const subtotal = calculateSubtotal({
      packagesToBuy: packageQty,
      pricePerPackage: item.pricePerPackageSnapshot,
      taxStatus: item.taxStatusSnapshot,
      taxRatePercent: item.taxRateValueSnapshot ?? 0,
    });

    return tx.purchaseOrderItem.update({
      where: { id: itemId },
      data: { packageQty, lineSubtotal: subtotal.subtotalAfterTax },
    });
  });
}

export async function removePurchaseOrderItem(businessId: string, orderId: string, itemId: string) {
  const order = await prisma.purchaseOrder.findFirst({ where: { id: orderId, businessId } });
  if (!order) return false;
  if (order.status !== "DRAFT") {
    throw new OrderStateError("Baris produk hanya bisa diubah selama pesanan masih draft.");
  }

  const result = await prisma.purchaseOrderItem.deleteMany({
    where: { id: itemId, purchaseOrderId: orderId },
  });
  return result.count > 0;
}

async function nextOrderNumber(tx: Prisma.TransactionClient, businessId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const count = await tx.purchaseOrder.count({
    where: { businessId, orderNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

/**
 * Menandai draft sebagai terkirim ke supplier (R16/R17). Nomor pesanan
 * dibuat di sini (bukan saat draft dibuat), format `PO-YYYY-NNNN`.
 * Membutuhkan minimal 1 baris produk.
 */
export async function markPurchaseOrderAsSent(businessId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findFirst({
      where: { id: orderId, businessId },
      include: { items: true },
    });
    if (!order) return null;
    if (order.status !== "DRAFT") {
      throw new OrderStateError("Hanya draft yang bisa dikirim.");
    }
    if (order.items.length === 0) {
      throw new OrderStateError("Tambahkan minimal 1 produk sebelum mengirim pesanan.");
    }

    const orderNumber = await nextOrderNumber(tx, businessId);
    return tx.purchaseOrder.update({
      where: { id: orderId },
      data: { status: "DIPESAN", orderNumber, sentAt: new Date() },
      include: ORDER_DETAIL_INCLUDE,
    });
  });
}

export async function updatePurchaseOrderItemAvailability(
  businessId: string,
  orderId: string,
  itemId: string,
  input: PurchaseOrderItemAvailabilityInput,
) {
  const order = await prisma.purchaseOrder.findFirst({ where: { id: orderId, businessId } });
  if (!order) return null;
  if (order.status !== "DIPESAN") {
    throw new OrderStateError(
      "Ketersediaan produk hanya bisa ditandai setelah pesanan dikirim ke supplier dan sebelum dikonfirmasi.",
    );
  }

  const result = await prisma.purchaseOrderItem.updateMany({
    where: { id: itemId, purchaseOrderId: orderId },
    data: {
      availabilityStatus: input.availabilityStatus,
      confirmedPackageQty: input.confirmedPackageQty ?? null,
    },
  });
  if (result.count === 0) return null;
  return prisma.purchaseOrderItem.findFirst({ where: { id: itemId } });
}

/**
 * Finalisasi pesanan: pilih metode bayar, status jadi DIKONFIRMASI.
 * Mewajibkan SETIAP baris sudah ditandai (tidak ada yang masih
 * `BELUM_DIKONFIRMASI`) agar pengguna benar-benar meninjau tiap baris
 * sebelum menganggap pesanan settle.
 */
export async function confirmPurchaseOrder(
  businessId: string,
  orderId: string,
  paymentMethod: PaymentMethod,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findFirst({
      where: { id: orderId, businessId },
      include: { items: true },
    });
    if (!order) return null;
    if (order.status !== "DIPESAN") {
      throw new OrderStateError("Hanya pesanan yang sudah dikirim yang bisa dikonfirmasi.");
    }
    const belumDikonfirmasi = order.items.some(
      (item) => item.availabilityStatus === "BELUM_DIKONFIRMASI",
    );
    if (belumDikonfirmasi) {
      throw new OrderStateError("Tandai ketersediaan semua baris produk sebelum konfirmasi.");
    }

    return tx.purchaseOrder.update({
      where: { id: orderId },
      data: { status: "DIKONFIRMASI", paymentMethod, confirmedAt: new Date() },
      include: ORDER_DETAIL_INCLUDE,
    });
  });
}

/** Pembatalan wajib mengisi alasan (R29). Diperbolehkan dari DRAFT atau DIPESAN. */
export async function cancelPurchaseOrder(
  businessId: string,
  orderId: string,
  cancelReason: string,
) {
  const order = await prisma.purchaseOrder.findFirst({ where: { id: orderId, businessId } });
  if (!order) return null;
  if (order.status !== "DRAFT" && order.status !== "DIPESAN") {
    throw new OrderStateError("Pesanan yang sudah dikonfirmasi tidak bisa dibatalkan dari sini.");
  }

  return prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status: "DIBATALKAN", cancelReason, cancelledAt: new Date() },
    include: ORDER_DETAIL_INCLUDE,
  });
}

/**
 * Hapus PERMANEN satu pesanan (docs/BACKLOG.md #5, disepakati bersama
 * pengguna 2026-08-21). Hanya diizinkan untuk status `DRAFT` (belum pernah
 * dikirim ke supplier) atau `DIBATALKAN` (sudah dibatalkan dengan alasan
 * tercatat, R29). Pesanan yang sudah `DIPESAN`/`DIKONFIRMASI`/dst harus
 * dibatalkan terlebih dahulu lewat `cancelPurchaseOrder` sebelum bisa
 * dihapus - supaya selalu ada jejak kenapa pesanan itu tidak jadi.
 */
export async function deletePurchaseOrder(businessId: string, orderId: string): Promise<boolean> {
  const order = await prisma.purchaseOrder.findFirst({ where: { id: orderId, businessId } });
  if (!order) return false;
  if (order.status !== "DRAFT" && order.status !== "DIBATALKAN") {
    throw new OrderStateError(
      "Batalkan pesanan ini terlebih dahulu sebelum menghapusnya secara permanen.",
    );
  }

  await prisma.purchaseOrder.delete({ where: { id: orderId } });
  return true;
}

export { OrderStateError };

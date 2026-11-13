import "server-only";
import { Decimal } from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { calculateSubtotal } from "@/lib/domain/pricing/subtotal";
import {
  computeStockAfterReversal,
  computeStockReversal,
} from "@/lib/domain/receiving/goods-receipt";
import { getDefaultBusinessLocation } from "@/lib/server/repositories/business-location-repository";
import { recomputeSupplierPerformance } from "@/lib/server/repositories/goods-receipt-repository";
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderItemAvailabilityInput,
  PurchaseOrderItemInput,
} from "@/lib/validation/purchase-order";
import type { PaymentMethod } from "@/lib/domain/orders/types";
import { computePaymentStatus } from "@/lib/domain/orders/payment";
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

/**
 * Ringkasan pesanan untuk DAFTAR Pesanan (perbaikan kecepatan 2026-11-13).
 * Daftar hanya butuh nomor, supplier, jumlah baris, total, dan status —
 * `ORDER_DETAIL_INCLUDE` memuat SEMUA baris + penawaran + produk tiap
 * pesanan, padahal total cukup dihitung dari snapshot baris
 * (`effectiveLineTotal` hanya butuh 6 field baris). Query ini memangkas
 * join berantai itu; detail lengkap tetap lewat `getPurchaseOrderById`.
 */
const ORDER_SUMMARY_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  createdAt: true,
  supplier: { select: { supplierName: true } },
  items: {
    select: {
      availabilityStatus: true,
      confirmedPackageQty: true,
      lineSubtotal: true,
      pricePerPackageSnapshot: true,
      taxStatusSnapshot: true,
      taxRateValueSnapshot: true,
    },
  },
} satisfies Prisma.PurchaseOrderSelect;

export type PurchaseOrderSummary = Prisma.PurchaseOrderGetPayload<{
  select: typeof ORDER_SUMMARY_SELECT;
}>;

export interface PurchaseOrderListFilters {
  status?: string;
  supplierId?: string;
}

/**
 * Jumlah baris produk di semua pesanan berstatus DRAFT (belum dikirim ke
 * supplier manapun) - dipakai sebagai badge "keranjang" di header (poin 3
 * permintaan pengguna 2026-08-21: bisa pilih produk berkali-kali tanpa
 * pindah halaman, lalu konfirmasi/kirim semuanya dari halaman Pesanan).
 */
export async function countDraftOrderItems(businessId: string): Promise<number> {
  return prisma.purchaseOrderItem.count({
    where: { businessId, purchaseOrder: { status: "DRAFT" } },
  });
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

/** Daftar Pesanan versi ringan — lihat `ORDER_SUMMARY_SELECT`. */
export async function listPurchaseOrderSummaries(
  businessId: string,
): Promise<PurchaseOrderSummary[]> {
  return prisma.purchaseOrder.findMany({
    where: { businessId },
    select: ORDER_SUMMARY_SELECT,
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

/** Total pesanan — menerima detail lengkap ATAU ringkasan (perbaikan
 * kecepatan 2026-11-13): `effectiveLineTotal` hanya butuh 6 field baris,
 * jadi daftar Pesanan tidak perlu memuat detail lengkap. */
export function computeOrderTotal(order: {
  items: Array<Parameters<typeof effectiveLineTotal>[0]>;
}): Decimal {
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
          // Kemasan ikut di-snapshot ulang bersama harga (perilaku yang sama:
          // baris draft selalu mengikuti penawaran terkini).
          packageTypeSnapshot: supplierProduct.packageType,
          itemsPerPackageSnapshot: supplierProduct.itemsPerPackage.toString(),
          contentPerItemSnapshot: supplierProduct.contentPerItem.toString(),
          contentUnitSnapshot: supplierProduct.contentUnit,
          totalPackageContentSnapshot: supplierProduct.totalPackageContent.toString(),
          baseUnitSnapshot: supplierProduct.baseUnit,
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
        // Snapshot kemasan penawaran SAAT baris ini dibuat.
        packageTypeSnapshot: supplierProduct.packageType,
        itemsPerPackageSnapshot: supplierProduct.itemsPerPackage.toString(),
        contentPerItemSnapshot: supplierProduct.contentPerItem.toString(),
        contentUnitSnapshot: supplierProduct.contentUnit,
        totalPackageContentSnapshot: supplierProduct.totalPackageContent.toString(),
        baseUnitSnapshot: supplierProduct.baseUnit,
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
  paymentDueDate?: Date,
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
    if (paymentMethod === "TEMPO" && !paymentDueDate) {
      throw new OrderStateError("Tanggal jatuh tempo wajib diisi untuk cara bayar Tempo.");
    }
    const belumDikonfirmasi = order.items.some(
      (item) => item.availabilityStatus === "BELUM_DIKONFIRMASI",
    );
    if (belumDikonfirmasi) {
      throw new OrderStateError("Tandai ketersediaan semua baris produk sebelum konfirmasi.");
    }

    return tx.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: "DIKONFIRMASI",
        paymentMethod,
        paymentDueDate: paymentMethod === "TEMPO" ? (paymentDueDate ?? null) : null,
        confirmedAt: new Date(),
      },
      include: ORDER_DETAIL_INCLUDE,
    });
  });
}

/**
 * Catat pembayaran untuk pesanan yang sudah dikonfirmasi (perbaikan #4).
 * Hanya untuk status DIKONFIRMASI/DIKIRIM/DITERIMA — sebelum konfirmasi
 * belum ada cara bayar yang dipilih. Jumlah dicatat kumulatif di
 * `paidAmount`; status bayar diturunkan dari total pesanan (dihitung
 * server dari baris, bukan dari klien): sebagian = DP, >= total = LUNAS.
 * Pembayaran yang melebihi sisa tagihan ditolak.
 */
export async function recordPayment(businessId: string, orderId: string, amount: Decimal.Value) {
  const paid = new Decimal(amount);
  if (paid.lte(0)) {
    throw new Error("Jumlah pembayaran harus lebih dari nol.");
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findFirst({
      where: { id: orderId, businessId },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) return null;
    if (
      order.status !== "DIKONFIRMASI" &&
      order.status !== "DIKIRIM" &&
      order.status !== "DITERIMA"
    ) {
      throw new OrderStateError("Pembayaran hanya bisa dicatat setelah pesanan dikonfirmasi.");
    }

    const total = computeOrderTotal(order);
    const newPaidAmount = new Decimal(order.paidAmount).plus(paid);
    if (newPaidAmount.gt(total)) {
      throw new Error(
        `Jumlah pembayaran melebihi sisa tagihan (sisa Rp${total.minus(order.paidAmount).toString()}).`,
      );
    }

    return tx.purchaseOrder.update({
      where: { id: orderId },
      data: {
        paidAmount: newPaidAmount,
        paymentStatus: computePaymentStatus(newPaidAmount, total),
      },
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
 * pengguna 2026-08-21; diperluas 2026-11-13 untuk status DITERIMA).
 *
 * DRAFT / DIBATALKAN: aman dihapus kapan saja (belum berefek nyata ke
 * supplier/riwayat). DITERIMA: boleh dihapus, TAPI dalam satu transaksi
 * penerimaan barangnya ikut dihapus dan stok toko yang dulu ditambahkan
 * dari penerimaan itu DIKURANGI lagi (kemasan baik x isi kemasan) —
 * supaya stok tidak menggelembung dari pesanan yang sudah tidak ada.
 * Bila stok saat ini kurang dari yang mau dikurangi (mis. barang sudah
 * terjual), hapus ditolak dengan pesan jelas. Kinerja supplier
 * direkomputasi ulang dari sisa pesanan yang masih ada.
 * DIPESAN / DIKONFIRMASI / DIKIRIM: tetap TIDAK bisa dihapus permanen —
 * batalkan dulu (DRAFT/DIPESAN) atau terima barangnya dulu
 * (DIKONFIRMASI/DIKIRIM), supaya selalu ada jejak kenapa pesanan itu
 * tidak jadi.
 */
export async function deletePurchaseOrder(businessId: string, orderId: string): Promise<boolean> {
  const order = await prisma.purchaseOrder.findFirst({ where: { id: orderId, businessId } });
  if (!order) return false;
  if (order.status === "DIPESAN" || order.status === "DIKONFIRMASI" || order.status === "DIKIRIM") {
    throw new OrderStateError(
      "Pesanan yang masih dipesan/dikonfirmasi/dikirim tidak bisa dihapus permanen. " +
        "Batalkan dulu (dari DRAFT/DIPESAN) atau terima barangnya dulu (dari DIKONFIRMASI/DIKIRIM) " +
        "sebelum menghapusnya.",
    );
  }

  if (order.status !== "DITERIMA") {
    await prisma.purchaseOrder.delete({ where: { id: orderId } });
    return true;
  }

  await prisma.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.findFirst({
      where: { purchaseOrderId: orderId, businessId },
      include: {
        items: {
          include: {
            purchaseOrderItem: {
              include: {
                supplierProduct: {
                  select: { productId: true, totalPackageContent: true },
                },
              },
            },
          },
        },
      },
    });

    if (receipt) {
      for (const item of receipt.items) {
        const reversal = computeStockReversal(
          item.conditionGoodQty,
          item.purchaseOrderItem.supplierProduct.totalPackageContent,
        );
        if (reversal.lte(0)) continue;
        const product = await tx.product.findFirst({
          where: { id: item.purchaseOrderItem.supplierProduct.productId, businessId },
          select: { stockQty: true, productName: true, brand: true, variant: true },
        });
        if (!product) continue;
        const productLabel = [product.productName, product.brand, product.variant]
          .filter(Boolean)
          .join(" ");
        const newStock = computeStockAfterReversal(product.stockQty, reversal, productLabel);
        await tx.product.update({
          where: { id: item.purchaseOrderItem.supplierProduct.productId },
          data: { stockQty: newStock },
        });
      }

      await tx.goodsReceiptItem.deleteMany({ where: { goodsReceiptId: receipt.id } });
      await tx.goodsReceipt.delete({ where: { id: receipt.id } });
    }

    await tx.purchaseOrder.delete({ where: { id: orderId } });
    await recomputeSupplierPerformance(tx, businessId, order.supplierId);
  });
  return true;
}

export { OrderStateError };

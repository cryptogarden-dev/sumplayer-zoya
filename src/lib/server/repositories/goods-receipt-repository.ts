import "server-only";
import { Decimal } from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import {
  computeReceiptCompleteness,
  computeStockAddition,
} from "@/lib/domain/receiving/goods-receipt";
import { estimateOnTimeRate } from "@/lib/domain/performance/on-time-rate";
import type { GoodsReceiptInput } from "@/lib/validation/goods-receipt";
import type { Prisma, Product } from "@generated/prisma/client";

/**
 * Penerimaan barang (R18) + kinerja supplier (R15, Tahap 5).
 *
 * Satu pesanan = satu penerimaan di v1 (UNIQUE `purchase_order_id` di
 * `goods_receipts`). Mencatat penerimaan sekaligus:
 * - mengubah status pesanan jadi DITERIMA (+ `receivedAt`),
 * - menambah stok toko produk (hanya barang kondisi BAIK, dalam satuan
 *   dasar: jumlah kemasan baik x isi kemasan),
 * - merekomputasi `supplier_performance` supplier pesanan itu.
 * Semua langkah dalam satu transaksi — tidak ada keadaan setengah jalan.
 */

const GOODS_RECEIPT_INCLUDE = {
  items: {
    include: {
      purchaseOrderItem: {
        include: {
          supplierProduct: {
            include: {
              product: {
                select: { id: true, productName: true, brand: true, variant: true, baseUnit: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.GoodsReceiptInclude;

export type GoodsReceiptWithDetails = Prisma.GoodsReceiptGetPayload<{
  include: typeof GOODS_RECEIPT_INCLUDE;
}>;

export async function getGoodsReceiptByOrder(businessId: string, orderId: string) {
  return prisma.goodsReceipt.findFirst({
    where: { purchaseOrderId: orderId, businessId },
    include: GOODS_RECEIPT_INCLUDE,
  });
}

export async function getSupplierPerformance(businessId: string, supplierId: string) {
  return prisma.supplierPerformance.findFirst({ where: { businessId, supplierId } });
}

export async function listSupplierPerformances(businessId: string, supplierIds: string[]) {
  if (supplierIds.length === 0) return [];
  return prisma.supplierPerformance.findMany({
    where: { businessId, supplierId: { in: supplierIds } },
  });
}

/**
 * Produk aktif yang stok tokonya sudah <= ambang peringatan (R18).
 * Ambang NULL = tidak ada peringatan untuk produk itu. Perbandingan
 * stok vs ambang dilakukan di JS (Prisma `where` tidak bisa membandingkan
 * dua kolom) — data produk satu bisnis berskala kecil-menengah.
 * Hanya kolom yang dipakai Beranda yang diambil (perbaikan kecepatan
 * 2026-11-13), bukan seluruh baris produk.
 */
export type LowStockProduct = Pick<
  Product,
  "id" | "productName" | "stockQty" | "lowStockThreshold" | "baseUnit"
>;

export async function listLowStockProducts(businessId: string): Promise<LowStockProduct[]> {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true, lowStockThreshold: { not: null } },
    select: {
      id: true,
      productName: true,
      stockQty: true,
      lowStockThreshold: true,
      baseUnit: true,
    },
    orderBy: { stockQty: "asc" },
  });
  return products.filter(
    (product) =>
      product.lowStockThreshold !== null &&
      new Decimal(product.stockQty).lte(new Decimal(product.lowStockThreshold)),
  );
}

/**
 * Mencatat penerimaan barang untuk satu pesanan. Pesanan harus berstatus
 * DIKONFIRMASI atau DIKIRIM dan belum pernah dicatat penerimaannya.
 * Jumlah yang dipesan per baris = `confirmedPackageQty` (bila status
 * SEBAGIAN) atau `packageQty`. Validasi server-side (jangan percaya
 * klien): baik + rusak <= diterima, dan total diterima > 0.
 */
export async function createGoodsReceipt(
  businessId: string,
  orderId: string,
  userId: string,
  input: GoodsReceiptInput,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findFirst({
      where: { id: orderId, businessId },
      include: {
        items: {
          include: {
            supplierProduct: { select: { productId: true, totalPackageContent: true } },
          },
        },
      },
    });
    if (!order) return null;
    if (order.status !== "DIKONFIRMASI" && order.status !== "DIKIRIM") {
      throw new Error(
        "Hanya pesanan yang sudah dikonfirmasi atau dikirim yang bisa diterima barangnya.",
      );
    }

    const existing = await tx.goodsReceipt.findFirst({ where: { purchaseOrderId: orderId } });
    if (existing) {
      throw new Error("Pesanan ini sudah pernah dicatat penerimaannya.");
    }

    const orderItemsById = new Map(order.items.map((item) => [item.id, item]));
    let totalReceived = new Decimal(0);
    const preparedItems = input.items.map((itemInput) => {
      const orderItem = orderItemsById.get(itemInput.purchaseOrderItemId);
      if (!orderItem) {
        throw new Error("Ada baris penerimaan yang bukan bagian dari pesanan ini.");
      }
      const received = new Decimal(itemInput.receivedQty);
      const good = new Decimal(itemInput.conditionGoodQty);
      const damaged = new Decimal(itemInput.conditionDamagedQty);
      if (good.plus(damaged).gt(received)) {
        throw new Error("Jumlah baik + rusak tidak boleh lebih dari jumlah diterima.");
      }
      totalReceived = totalReceived.plus(received);
      return {
        orderItem,
        orderedQty: new Decimal(orderItem.confirmedPackageQty ?? orderItem.packageQty),
        receivedQty: received,
        conditionGoodQty: good,
        conditionDamagedQty: damaged,
        priceMatches: itemInput.priceMatches,
        actualPricePerPackage:
          itemInput.actualPricePerPackage !== undefined
            ? new Decimal(itemInput.actualPricePerPackage)
            : null,
        notes: itemInput.notes ?? null,
      };
    });
    if (totalReceived.lte(0)) {
      throw new Error("Total barang yang diterima harus lebih dari nol.");
    }

    const { isPartial, overallCompleteness } = computeReceiptCompleteness(
      preparedItems.map((item) => ({
        orderedQty: item.orderedQty,
        receivedQty: item.receivedQty,
      })),
    );
    const receivedAt = new Date();

    const receipt = await tx.goodsReceipt.create({
      data: {
        businessId,
        purchaseOrderId: order.id,
        receivedAt,
        isPartial,
        overallCompleteness,
        onTime: input.onTime,
        receiptPhotoUrl: input.receiptPhotoUrl ?? null,
        notes: input.notes ?? null,
        createdById: userId,
      },
    });

    await tx.goodsReceiptItem.createMany({
      data: preparedItems.map((item) => ({
        goodsReceiptId: receipt.id,
        purchaseOrderItemId: item.orderItem.id,
        businessId,
        orderedQty: item.orderedQty,
        receivedQty: item.receivedQty,
        conditionGoodQty: item.conditionGoodQty,
        conditionDamagedQty: item.conditionDamagedQty,
        priceMatches: item.priceMatches,
        actualPricePerPackage: item.actualPricePerPackage,
        notes: item.notes,
      })),
    });

    // Stok toko bertambah hanya dari barang kondisi BAIK (satuan dasar).
    for (const item of preparedItems) {
      const addition = computeStockAddition(
        item.conditionGoodQty,
        item.orderItem.supplierProduct.totalPackageContent,
      );
      if (addition.lte(0)) continue;
      const product = await tx.product.findFirst({
        where: { id: item.orderItem.supplierProduct.productId, businessId },
        select: { stockQty: true },
      });
      if (!product) continue;
      await tx.product.update({
        where: { id: item.orderItem.supplierProduct.productId },
        data: { stockQty: new Decimal(product.stockQty).plus(addition) },
      });
    }

    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: { status: "DITERIMA", receivedAt },
    });

    await recomputeSupplierPerformance(tx, businessId, order.supplierId);

    return tx.goodsReceipt.findFirst({
      where: { id: receipt.id },
      include: GOODS_RECEIPT_INCLUDE,
    });
  });
}

/**
 * Rekomputasi kinerja satu supplier dari sumber kebenaran
 * (`purchase_orders` DITERIMA + `goods_receipts` on_time) — bukan dari
 * nilai lama yang ditambah-tambah. Rumus rate memakai Laplace smoothing
 * yang sama dengan `estimateOnTimeRate` (R15).
 *
 * Diekspor karena dipakai juga oleh `deletePurchaseOrder`
 * (purchase-order-repository): setelah pesanan DITERIMA dihapus, kinerja
 * supplier itu harus dihitung ulang dari sisa pesanan yang masih ada.
 */
export async function recomputeSupplierPerformance(
  tx: Prisma.TransactionClient,
  businessId: string,
  supplierId: string,
) {
  const [completedCount, onTimeCount] = await Promise.all([
    tx.purchaseOrder.count({
      where: { businessId, supplierId, status: "DITERIMA" },
    }),
    tx.goodsReceipt.count({
      where: { businessId, onTime: true, purchaseOrder: { supplierId } },
    }),
  ]);
  const rate = estimateOnTimeRate({ onTimeCount, completedCount }).rate.toDecimalPlaces(4);

  await tx.supplierPerformance.upsert({
    where: { supplierId },
    update: {
      completedOrdersCount: completedCount,
      onTimeCount,
      onTimeRate: rate,
      lastCalculatedAt: new Date(),
    },
    create: {
      businessId,
      supplierId,
      completedOrdersCount: completedCount,
      onTimeCount,
      onTimeRate: rate,
      lastCalculatedAt: new Date(),
    },
  });
}

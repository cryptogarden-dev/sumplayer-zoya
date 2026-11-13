import "server-only";
import { Decimal } from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { attachPriceHistoryChanges } from "@/lib/domain/pricing/price-history";
import type { PriceChangeResult } from "@/lib/domain/pricing/price-change";
import { calculatePricePerBaseUnit } from "@/lib/domain/pricing/unit-price";
import { calculateSubtotal } from "@/lib/domain/pricing/subtotal";
import type { Money } from "@/lib/domain/money/money";
import type { TaxStatus } from "@/lib/domain/pricing/types";
import type { BaseUnit, MeasurementUnit, PackagingType } from "@generated/prisma/client";

/**
 * Riwayat harga beli satu produk (perbaikan #5).
 *
 * Sumber kebenaran ada dua, keduanya nyata (bukan contoh):
 * - `supplier_prices` — append-only (R20): setiap perubahan harga
 *   penawaran menambah baris baru, tidak pernah menimpa yang lama.
 * - `purchase_order_items.price_per_package_snapshot` — harga aktual yang
 *   dibayar pada pesanan yang sudah Dikonfirmasi/Dikirim/Diterima.
 *
 * Harga per satuan dasar dihitung SETELAH pajak (sama seperti Bandingkan)
 * agar bisa dibandingkan antar kemasan/supplier. Perubahan dihitung vs
 * entri sebelumnya dari PRODUK YANG SAMA secara kronologis (tidak
 * peduli penawarannya berbeda atau sumbernya Penawaran vs Pembelian) —
 * hanya baris paling awal dalam seluruh riwayat yang tidak punya
 * pembanding (`change: null`).
 * Logika urut + perubahan ada di `src/lib/domain/pricing/price-history.ts`
 * (fungsi murni, diuji unit) — repository ini hanya mengambil data mentah.
 */

export type PriceHistorySource = "PENAWARAN" | "PEMBELIAN";

export interface PriceHistoryRow {
  id: string;
  date: Date;
  source: PriceHistorySource;
  supplierProductId: string;
  supplierName: string;
  /** Nomor pesanan (hanya untuk sumber PEMBELIAN). */
  orderNumber: string | null;
  packageType: PackagingType;
  itemsPerPackage: Decimal;
  contentPerItem: Decimal;
  contentUnit: MeasurementUnit;
  totalPackageContent: Decimal;
  baseUnit: BaseUnit;
  taxStatus: TaxStatus;
  pricePerPackage: Decimal;
  /** Harga per satuan dasar SETELAH pajak. */
  pricePerBaseUnit: Money;
  /** Perubahan vs entri sebelumnya dari produk yang sama. */
  change: PriceChangeResult | null;
}

function pricePerBaseUnitAfterTax(
  pricePerPackage: Decimal.Value,
  taxStatus: TaxStatus,
  taxRatePercent: Decimal.Value | null | undefined,
  totalPackageContent: Decimal.Value,
): Money {
  const pricePerPackageAfterTax = calculateSubtotal({
    packagesToBuy: 1,
    pricePerPackage,
    taxStatus,
    taxRatePercent: taxRatePercent ?? 0,
  }).pricePerPackageAfterTax;
  return calculatePricePerBaseUnit(pricePerPackageAfterTax, totalPackageContent);
}

export async function listPurchasePriceHistory(
  businessId: string,
  productId: string,
): Promise<PriceHistoryRow[]> {
  const [offers, orderItems] = await Promise.all([
    prisma.supplierProduct.findMany({
      where: { businessId, productId },
      include: {
        supplier: { select: { supplierName: true } },
        prices: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.purchaseOrderItem.findMany({
      where: {
        businessId,
        supplierProduct: { productId },
        purchaseOrder: { status: { in: ["DIKONFIRMASI", "DIKIRIM", "DITERIMA"] } },
      },
      include: {
        purchaseOrder: {
          select: {
            orderNumber: true,
            createdAt: true,
            confirmedAt: true,
            supplier: { select: { supplierName: true } },
          },
        },
        supplierProduct: {
          select: {
            packageType: true,
            itemsPerPackage: true,
            contentPerItem: true,
            contentUnit: true,
            totalPackageContent: true,
            baseUnit: true,
          },
        },
      },
      orderBy: { purchaseOrder: { createdAt: "asc" } },
    }),
  ]);

  const rows: PriceHistoryRow[] = [];

  for (const offer of offers) {
    for (const price of offer.prices) {
      // Kemasan diambil dari SNAPSHOT saat entri harga ini dibuat, bukan dari
      // definisi penawaran saat ini (definisi bisa berubah, mis. DUS -> PACK;
      // baris lama harus tetap menampilkan kemasan + harga satuan saat itu).
      // Fallback ke definisi saat ini hanya untuk baris yang dibuat sebelum
      // migrasi snapshot (seharusnya sudah ter-backfill).
      const packageType = price.packageTypeSnapshot ?? offer.packageType;
      const itemsPerPackage = new Decimal(price.itemsPerPackageSnapshot ?? offer.itemsPerPackage);
      const contentPerItem = new Decimal(price.contentPerItemSnapshot ?? offer.contentPerItem);
      const contentUnit = price.contentUnitSnapshot ?? offer.contentUnit;
      const totalPackageContent = new Decimal(
        price.totalPackageContentSnapshot ?? offer.totalPackageContent,
      );
      const baseUnit = price.baseUnitSnapshot ?? offer.baseUnit;
      rows.push({
        id: `penawaran-${price.id}`,
        date: price.createdAt,
        source: "PENAWARAN",
        supplierProductId: offer.id,
        supplierName: offer.supplier.supplierName,
        orderNumber: null,
        packageType,
        itemsPerPackage,
        contentPerItem,
        contentUnit,
        totalPackageContent,
        baseUnit,
        taxStatus: price.taxStatus,
        pricePerPackage: new Decimal(price.pricePerPackage),
        pricePerBaseUnit: pricePerBaseUnitAfterTax(
          price.pricePerPackage,
          price.taxStatus,
          price.taxRateValueSnapshot,
          totalPackageContent,
        ),
        change: null,
      });
    }
  }

  for (const item of orderItems) {
    // Sama: kemasan dari snapshot saat baris pesanan dibuat.
    const packageType = item.packageTypeSnapshot ?? item.supplierProduct.packageType;
    const itemsPerPackage = new Decimal(
      item.itemsPerPackageSnapshot ?? item.supplierProduct.itemsPerPackage,
    );
    const contentPerItem = new Decimal(
      item.contentPerItemSnapshot ?? item.supplierProduct.contentPerItem,
    );
    const contentUnit = item.contentUnitSnapshot ?? item.supplierProduct.contentUnit;
    const totalPackageContent = new Decimal(
      item.totalPackageContentSnapshot ?? item.supplierProduct.totalPackageContent,
    );
    const baseUnit = item.baseUnitSnapshot ?? item.supplierProduct.baseUnit;
    rows.push({
      id: `pembelian-${item.id}`,
      date: item.purchaseOrder.confirmedAt ?? item.purchaseOrder.createdAt,
      source: "PEMBELIAN",
      supplierProductId: item.supplierProductId,
      supplierName: item.purchaseOrder.supplier.supplierName,
      orderNumber: item.purchaseOrder.orderNumber,
      packageType,
      itemsPerPackage,
      contentPerItem,
      contentUnit,
      totalPackageContent,
      baseUnit,
      taxStatus: item.taxStatusSnapshot,
      pricePerPackage: new Decimal(item.pricePerPackageSnapshot),
      pricePerBaseUnit: pricePerBaseUnitAfterTax(
        item.pricePerPackageSnapshot,
        item.taxStatusSnapshot,
        item.taxRateValueSnapshot,
        totalPackageContent,
      ),
      change: null,
    });
  }

  // Urut kronologis + perubahan vs entri sebelumnya dari produk yang
  // sama dihitung oleh fungsi murni (lihat price-history.ts); hasil
  // akhirnya terbaru dulu.
  return attachPriceHistoryChanges(rows);
}

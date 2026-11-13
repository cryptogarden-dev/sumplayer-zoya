import { Decimal } from "decimal.js";
import { money, type Money } from "@/lib/domain/money/money";
import { calculatePricePerBaseUnit } from "@/lib/domain/pricing/unit-price";
import { calculateSubtotal } from "@/lib/domain/pricing/subtotal";
import type { TaxStatus } from "@/lib/domain/pricing/types";

/**
 * Margin jual vs beli per satuan dasar (perbaikan #5, 2026-11-13).
 *
 * Harga beli = harga penawaran aktif termurah per satuan dasar SETELAH
 * pajak; harga jual = `Product.sellPricePerBaseUnit`. Bila salah satunya
 * belum ada, margin TIDAK dihitung (kembali `null`) — jangan tampilkan
 * margin 0 yang menyesatkan.
 */

export interface BuyOfferPrice {
  pricePerPackage: Decimal.Value;
  taxStatus: TaxStatus;
  taxRatePercent: Decimal.Value;
  totalPackageContent: Decimal.Value;
  supplierName: string;
}

export interface CheapestBuyPrice {
  pricePerBaseUnit: Money;
  supplierName: string;
}

/**
 * Harga beli termurah per satuan dasar dari penawaran yang diberikan.
 * Penawaran tanpa harga dilewati; `null` bila tidak ada penawaran
 * berharganya sama sekali.
 */
export function computeCheapestBuyPricePerBaseUnit(
  offers: readonly BuyOfferPrice[],
): CheapestBuyPrice | null {
  let cheapest: CheapestBuyPrice | null = null;
  for (const offer of offers) {
    const pricePerPackageAfterTax = calculateSubtotal({
      packagesToBuy: 1,
      pricePerPackage: offer.pricePerPackage,
      taxStatus: offer.taxStatus,
      taxRatePercent: offer.taxRatePercent,
    }).pricePerPackageAfterTax;
    const pricePerBaseUnit = calculatePricePerBaseUnit(
      pricePerPackageAfterTax,
      offer.totalPackageContent,
    );
    if (cheapest === null || pricePerBaseUnit.lessThan(cheapest.pricePerBaseUnit)) {
      cheapest = { pricePerBaseUnit, supplierName: offer.supplierName };
    }
  }
  return cheapest;
}

export interface MarginInput {
  sellPricePerBaseUnit: Decimal.Value | null | undefined;
  buyPricePerBaseUnit: Decimal.Value | null | undefined;
}

export interface MarginResult {
  /** Selisih jual − beli per satuan dasar (boleh negatif bila jual < beli). */
  amount: Money;
  /** Persen margin terhadap harga beli. `null` bila harga beli 0. */
  percent: Decimal | null;
}

/**
 * Margin per satuan dasar. `null` bila harga jual atau harga beli belum
 * ada — pemanggil menampilkan "—", bukan angka.
 */
export function computeMargin(input: MarginInput): MarginResult | null {
  if (input.sellPricePerBaseUnit == null || input.buyPricePerBaseUnit == null) {
    return null;
  }
  const sell = money(input.sellPricePerBaseUnit, "Harga jual");
  const buy = money(input.buyPricePerBaseUnit, "Harga beli");
  const amount = sell.minus(buy);
  const percent = buy.isZero() ? null : amount.div(buy).mul(100);
  return { amount, percent };
}

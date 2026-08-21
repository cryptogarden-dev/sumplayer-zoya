import { Decimal } from "decimal.js";
import { assertPositiveQuantity } from "@/lib/domain/units/convert";
import { calculateTax } from "@/lib/domain/pricing/tax";
import type { Money } from "@/lib/domain/money/money";
import type { TaxStatus } from "@/lib/domain/pricing/types";

/**
 * Subtotal pesanan setelah pajak (poin 11 Tahap 2, R10):
 * subtotalSetelahPajak = hargaPerKemasanSetelahPajak x jumlahKemasanDibeli
 */
export interface SubtotalInput {
  packagesToBuy: Decimal.Value;
  pricePerPackage: Decimal.Value;
  taxStatus: TaxStatus;
  taxRatePercent: Decimal.Value;
}

export interface SubtotalResult {
  pricePerPackageBeforeTax: Money;
  taxAmountPerPackage: Money;
  pricePerPackageAfterTax: Money;
  /** Subtotal seluruh pesanan setelah pajak. */
  subtotalAfterTax: Money;
}

export function calculateSubtotal(input: SubtotalInput): SubtotalResult {
  const packages = assertPositiveQuantity(input.packagesToBuy, "Jumlah kemasan yang dibeli");

  const tax = calculateTax({
    taxStatus: input.taxStatus,
    pricePerPackage: input.pricePerPackage,
    taxRatePercent: input.taxRatePercent,
  });

  return {
    pricePerPackageBeforeTax: tax.priceBeforeTax,
    taxAmountPerPackage: tax.taxAmount,
    pricePerPackageAfterTax: tax.priceAfterTax,
    subtotalAfterTax: tax.priceAfterTax.mul(packages),
  };
}

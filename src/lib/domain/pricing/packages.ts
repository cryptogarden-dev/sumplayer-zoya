import { Decimal } from "decimal.js";
import { assertPositiveQuantity } from "@/lib/domain/units/convert";
import { InvalidQuantityError } from "@/lib/domain/errors/domain-errors";

/**
 * Perhitungan jumlah kemasan yang harus dibeli (poin 8 Tahap 2, R11).
 *
 * Rumus dasar:
 *   packagesRequired = ceil(kebutuhan / isiSatuKemasan)
 *
 * Kemudian disesuaikan terhadap:
 * 1. Minimum pembelian — jika hasil di bawah minimum, naikkan ke minimum.
 * 2. Kelipatan pembelian — bulatkan ke atas ke kelipatan terdekat.
 *
 * Stok TIDAK mengubah angka ini secara diam-diam (lihat stock.ts) — jika
 * stok kurang, itu harus ditandai sebagai peringatan terpisah, bukan
 * memotong jumlah yang dibeli tanpa sepengetahuan pengguna (R11).
 */
export interface PurchaseQuantityInput {
  /** Kebutuhan pengguna, dalam satuan dasar (kg/liter/pcs). */
  neededQuantityInBaseUnit: Decimal.Value;
  /** Isi 1 kemasan, dalam satuan dasar (kg/liter/pcs). */
  contentPerPackageInBaseUnit: Decimal.Value;
  /** Minimum pembelian dalam jumlah kemasan. Default 1 (tidak ada minimum khusus). */
  minimumPurchasePackages?: Decimal.Value;
  /** Kelipatan pembelian dalam jumlah kemasan. Default 1 (tidak ada kelipatan khusus). */
  purchaseMultiple?: Decimal.Value;
}

export interface PurchaseQuantityResult {
  /** ceil(kebutuhan / isi) SEBELUM disesuaikan minimum & kelipatan. */
  packagesRequiredRaw: Decimal;
  /** Jumlah kemasan aktual yang harus dibeli setelah minimum & kelipatan. */
  packagesToBuy: Decimal;
  /** Jumlah aktual yang akan diterima (packagesToBuy x isi per kemasan), dalam satuan dasar. */
  actualQuantityInBaseUnit: Decimal;
  /** Kelebihan akibat pembulatan kemasan (actual - kebutuhan), dalam satuan dasar. Selalu >= 0. */
  excessQuantityInBaseUnit: Decimal;
}

function assertPositivePackageCount(
  value: Decimal.Value | undefined,
  fallback: number,
  label: string,
): Decimal {
  if (value === undefined) {
    return new Decimal(fallback);
  }
  return assertPositiveQuantity(value, label);
}

export function calculatePurchaseQuantity(input: PurchaseQuantityInput): PurchaseQuantityResult {
  const needed = assertPositiveQuantity(input.neededQuantityInBaseUnit, "Kebutuhan");
  const contentPerPackage = assertPositiveQuantity(
    input.contentPerPackageInBaseUnit,
    "Isi per kemasan",
  );
  const minimum = assertPositivePackageCount(input.minimumPurchasePackages, 1, "Minimum pembelian");
  const multiple = assertPositivePackageCount(input.purchaseMultiple, 1, "Kelipatan pembelian");

  if (!Number.isInteger(multiple.toNumber())) {
    throw new InvalidQuantityError("Kelipatan pembelian harus berupa bilangan bulat kemasan.");
  }

  // Rumus dasar R11: packagesRequired = ceil(kebutuhan / isiSatuKemasan)
  const packagesRequiredRaw = needed.div(contentPerPackage).ceil();

  // Sesuaikan terhadap minimum pembelian.
  let packagesToBuy = Decimal.max(packagesRequiredRaw, minimum);

  // Sesuaikan terhadap kelipatan pembelian (bulatkan ke atas ke kelipatan terdekat).
  packagesToBuy = packagesToBuy.div(multiple).ceil().mul(multiple);

  const actualQuantityInBaseUnit = packagesToBuy.mul(contentPerPackage);
  const excessQuantityInBaseUnit = actualQuantityInBaseUnit.minus(needed);

  return {
    packagesRequiredRaw,
    packagesToBuy,
    actualQuantityInBaseUnit,
    excessQuantityInBaseUnit,
  };
}

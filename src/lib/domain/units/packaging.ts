import { Decimal } from "decimal.js";
import { assertPositiveQuantity, toBaseUnit } from "@/lib/domain/units/convert";
import type {
  BaseUnit,
  MeasurementUnit,
  PackagingType,
  UnitFamily,
} from "@/lib/domain/units/types";

/**
 * Struktur kemasan (poin 4 Tahap 2, R03):
 * - Jenis kemasan.
 * - Jumlah barang dalam kemasan.
 * - Isi setiap barang + satuan isi.
 *
 * Contoh:
 * - 1 karung beras 25 kg -> { itemsPerPackage: 1, contentPerItem: 25, contentUnit: "KILOGRAM" }
 * - 1 dus minyak = 12 botol x 1 liter -> { itemsPerPackage: 12, contentPerItem: 1, contentUnit: "LITER" }
 * - 1 dus barang = 24 pcs -> { itemsPerPackage: 24, contentPerItem: 1, contentUnit: "PCS" }
 */
export interface PackageDefinition {
  packagingType: PackagingType;
  itemsPerPackage: Decimal.Value;
  contentPerItem: Decimal.Value;
  contentUnit: MeasurementUnit;
}

/**
 * Hasil resolusi kemasan: total isi kemasan sudah dinormalisasi ke satuan
 * dasar family-nya (poin 4 Tahap 2: "total isi dalam satuan dasar").
 */
export interface ResolvedPackage {
  packagingType: PackagingType;
  itemsPerPackage: Decimal;
  contentPerItem: Decimal;
  contentUnit: MeasurementUnit;
  family: UnitFamily;
  baseUnit: BaseUnit;
  /** Total isi 1 kemasan, dalam satuan dasar (kg/liter/pcs). */
  totalContentInBaseUnit: Decimal;
}

/**
 * Menghitung total isi kemasan dalam satuan dasar dari struktur kemasan.
 * Menolak jumlah barang atau isi per barang yang nol/negatif (poin 5).
 */
export function resolvePackage(definition: PackageDefinition): ResolvedPackage {
  const itemsPerPackage = assertPositiveQuantity(
    definition.itemsPerPackage,
    "Jumlah barang dalam kemasan",
  );

  const contentPerItemBase = toBaseUnit(definition.contentPerItem, definition.contentUnit);

  return {
    packagingType: definition.packagingType,
    itemsPerPackage,
    contentPerItem: new Decimal(definition.contentPerItem),
    contentUnit: definition.contentUnit,
    family: contentPerItemBase.family,
    baseUnit: contentPerItemBase.baseUnit,
    totalContentInBaseUnit: itemsPerPackage.mul(contentPerItemBase.quantity),
  };
}

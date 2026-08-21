/**
 * Jenis dimensi/family satuan (poin 1 Tahap 2, R05).
 * Satuan dari family berbeda TIDAK PERNAH boleh dibandingkan/dikonversi
 * satu sama lain (lihat `assertSameFamily` di convert.ts).
 */
export const UNIT_FAMILIES = ["WEIGHT", "VOLUME", "COUNT"] as const;
export type UnitFamily = (typeof UNIT_FAMILIES)[number];

/**
 * Satuan pengukuran dengan faktor konversi tetap (poin 2 Tahap 2, R04).
 * Ini BUKAN jenis kemasan (dus/pak/karung/dll.) — kemasan bersifat
 * deskriptif dan tidak punya faktor konversi baku (lihat packaging.ts).
 */
export const MEASUREMENT_UNITS = [
  "GRAM",
  "KILOGRAM",
  "MILLILITER",
  "LITER",
  "PCS",
  "LUSIN",
] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

/**
 * Satuan dasar per family (poin 3 Tahap 2, R05):
 * - Berat -> kilogram
 * - Volume -> liter
 * - Jumlah -> pcs
 */
export type BaseUnit = "KILOGRAM" | "LITER" | "PCS";

/**
 * Jenis kemasan (poin 2 Tahap 2, R04). Nilainya deskriptif saja — tidak
 * mengandung faktor konversi baku. Konversi nyata dihitung dari struktur
 * kemasan (lihat packaging.ts).
 */
export const PACKAGING_TYPES = [
  "DUS",
  "PAK",
  "KARUNG",
  "BOTOL",
  "KALENG",
  "SAK",
  "BAL",
  "TRAY",
  "BOX",
  "RENCENG",
] as const;
export type PackagingType = (typeof PACKAGING_TYPES)[number];

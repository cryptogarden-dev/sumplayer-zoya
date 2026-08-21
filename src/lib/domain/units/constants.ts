import { Decimal } from "decimal.js";
import type { BaseUnit, MeasurementUnit, UnitFamily } from "@/lib/domain/units/types";

/**
 * Family setiap satuan pengukuran (R04, R05).
 */
export const UNIT_FAMILY: Record<MeasurementUnit, UnitFamily> = {
  GRAM: "WEIGHT",
  KILOGRAM: "WEIGHT",
  MILLILITER: "VOLUME",
  LITER: "VOLUME",
  PCS: "COUNT",
  LUSIN: "COUNT",
};

/**
 * Satuan dasar resmi per family (poin 3 Tahap 2):
 * - WEIGHT -> KILOGRAM
 * - VOLUME -> LITER
 * - COUNT  -> PCS
 */
export const BASE_UNIT_BY_FAMILY: Record<UnitFamily, BaseUnit> = {
  WEIGHT: "KILOGRAM",
  VOLUME: "LITER",
  COUNT: "PCS",
};

/**
 * Faktor konversi setiap satuan pengukuran ke satuan dasar family-nya.
 * Ini adalah konstanta FISIK (bukan kebijakan bisnis seperti tarif pajak),
 * sehingga boleh berupa nilai tetap di kode — lihat docs/ARCHITECTURE.md
 * §6.2.
 *
 * - 1 gram = 0,001 kilogram
 * - 1 kilogram = 1 kilogram (basis)
 * - 1 mililiter = 0,001 liter
 * - 1 liter = 1 liter (basis)
 * - 1 pcs = 1 pcs (basis)
 * - 1 lusin = 12 pcs
 */
export const UNIT_TO_BASE_FACTOR: Record<MeasurementUnit, Decimal> = {
  GRAM: new Decimal("0.001"),
  KILOGRAM: new Decimal(1),
  MILLILITER: new Decimal("0.001"),
  LITER: new Decimal(1),
  PCS: new Decimal(1),
  LUSIN: new Decimal(12),
};

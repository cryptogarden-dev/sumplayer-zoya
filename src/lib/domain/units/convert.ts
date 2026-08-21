import { Decimal } from "decimal.js";
import {
  BASE_UNIT_BY_FAMILY,
  UNIT_FAMILY,
  UNIT_TO_BASE_FACTOR,
} from "@/lib/domain/units/constants";
import type { BaseUnit, MeasurementUnit, UnitFamily } from "@/lib/domain/units/types";
import { IncompatibleUnitError, InvalidQuantityError } from "@/lib/domain/errors/domain-errors";

export interface BaseQuantity {
  family: UnitFamily;
  baseUnit: BaseUnit;
  quantity: Decimal;
}

/**
 * Kuantitas fisik (isi kemasan, kebutuhan, dst.) WAJIB lebih dari nol
 * (poin 5 Tahap 2: "Tolak konversi ... nilai nol atau negatif").
 * Ini berbeda dari `money()` yang mengizinkan nol.
 */
export function assertPositiveQuantity(value: Decimal.Value, label = "Kuantitas"): Decimal {
  const decimal = new Decimal(value);

  if (!decimal.isFinite()) {
    throw new InvalidQuantityError(`${label} harus berupa angka yang valid.`);
  }

  if (decimal.lte(0)) {
    throw new InvalidQuantityError(`${label} harus lebih dari nol.`);
  }

  return decimal;
}

export function unitFamilyOf(unit: MeasurementUnit): UnitFamily {
  return UNIT_FAMILY[unit];
}

export function baseUnitOf(family: UnitFamily): BaseUnit {
  return BASE_UNIT_BY_FAMILY[family];
}

/**
 * Menegakkan R05: satuan dari family berbeda tidak boleh
 * dibandingkan/dikonversi (kg ↔ liter, liter ↔ pcs, pcs ↔ kg, dst.).
 */
export function assertSameFamily(a: UnitFamily, b: UnitFamily): void {
  if (a !== b) {
    throw new IncompatibleUnitError(a, b);
  }
}

/**
 * Kenyamanan pemanggilan `assertSameFamily` langsung dari kode satuan
 * (bukan family), dipakai kasus uji #21 ("konversi kg ke liter ditolak").
 */
export function assertCompatibleUnits(a: MeasurementUnit, b: MeasurementUnit): void {
  assertSameFamily(unitFamilyOf(a), unitFamilyOf(b));
}

/**
 * Mengonversi kuantitas dalam satuan apa pun ke satuan dasar family-nya
 * (poin 3 Tahap 2, R05). Menolak kuantitas nol/negatif (poin 5).
 *
 * Contoh: toBaseUnit(1000, "GRAM") -> { family: "WEIGHT", baseUnit:
 * "KILOGRAM", quantity: 1 }
 */
export function toBaseUnit(quantity: Decimal.Value, unit: MeasurementUnit): BaseQuantity {
  const value = assertPositiveQuantity(quantity, "Kuantitas satuan");
  const family = unitFamilyOf(unit);
  const factor = UNIT_TO_BASE_FACTOR[unit];

  return {
    family,
    baseUnit: baseUnitOf(family),
    quantity: value.mul(factor),
  };
}

import { describe, expect, it } from "vitest";
import {
  assertCompatibleUnits,
  assertPositiveQuantity,
  assertSameFamily,
  baseUnitOf,
  toBaseUnit,
  unitFamilyOf,
} from "@/lib/domain/units/convert";
import { IncompatibleUnitError, InvalidQuantityError } from "@/lib/domain/errors/domain-errors";

describe("unitFamilyOf & baseUnitOf", () => {
  it("mengelompokkan gram & kilogram sebagai WEIGHT dengan basis KILOGRAM", () => {
    expect(unitFamilyOf("GRAM")).toBe("WEIGHT");
    expect(unitFamilyOf("KILOGRAM")).toBe("WEIGHT");
    expect(baseUnitOf("WEIGHT")).toBe("KILOGRAM");
  });

  it("mengelompokkan mililiter & liter sebagai VOLUME dengan basis LITER", () => {
    expect(unitFamilyOf("MILLILITER")).toBe("VOLUME");
    expect(unitFamilyOf("LITER")).toBe("VOLUME");
    expect(baseUnitOf("VOLUME")).toBe("LITER");
  });

  it("mengelompokkan pcs & lusin sebagai COUNT dengan basis PCS", () => {
    expect(unitFamilyOf("PCS")).toBe("COUNT");
    expect(unitFamilyOf("LUSIN")).toBe("COUNT");
    expect(baseUnitOf("COUNT")).toBe("PCS");
  });
});

describe("toBaseUnit — kasus uji #4, #5, #6", () => {
  it("kasus uji #4: 1.000 gram = 1 kilogram", () => {
    const result = toBaseUnit(1000, "GRAM");
    expect(result.family).toBe("WEIGHT");
    expect(result.baseUnit).toBe("KILOGRAM");
    expect(result.quantity.toNumber()).toBe(1);
  });

  it("kasus uji #5: 1.000 ml = 1 liter", () => {
    const result = toBaseUnit(1000, "MILLILITER");
    expect(result.family).toBe("VOLUME");
    expect(result.baseUnit).toBe("LITER");
    expect(result.quantity.toNumber()).toBe(1);
  });

  it("kasus uji #6: 1 lusin = 12 pcs", () => {
    const result = toBaseUnit(1, "LUSIN");
    expect(result.family).toBe("COUNT");
    expect(result.baseUnit).toBe("PCS");
    expect(result.quantity.toNumber()).toBe(12);
  });

  it("satuan yang sudah basis dikembalikan apa adanya", () => {
    expect(toBaseUnit(25, "KILOGRAM").quantity.toNumber()).toBe(25);
    expect(toBaseUnit(12, "LITER").quantity.toNumber()).toBe(12);
    expect(toBaseUnit(24, "PCS").quantity.toNumber()).toBe(24);
  });
});

describe("kasus uji #22: nilai negatif dan isi nol ditolak", () => {
  it("menolak kuantitas nol", () => {
    expect(() => toBaseUnit(0, "KILOGRAM")).toThrow(InvalidQuantityError);
    expect(() => assertPositiveQuantity(0)).toThrow(InvalidQuantityError);
  });

  it("menolak kuantitas negatif", () => {
    expect(() => toBaseUnit(-5, "LITER")).toThrow(InvalidQuantityError);
    expect(() => assertPositiveQuantity(-1)).toThrow(InvalidQuantityError);
  });

  it("menolak kuantitas yang bukan angka valid", () => {
    expect(() => assertPositiveQuantity(Number.NaN)).toThrow(InvalidQuantityError);
    expect(() => assertPositiveQuantity(Number.POSITIVE_INFINITY)).toThrow(InvalidQuantityError);
  });
});

describe("kasus uji #21: konversi antar family ditolak", () => {
  it("menolak konversi kg ke liter (WEIGHT vs VOLUME)", () => {
    expect(() => assertCompatibleUnits("KILOGRAM", "LITER")).toThrow(IncompatibleUnitError);
  });

  it("menolak konversi liter ke pcs (VOLUME vs COUNT)", () => {
    expect(() => assertCompatibleUnits("LITER", "PCS")).toThrow(IncompatibleUnitError);
  });

  it("menolak konversi pcs ke kg (COUNT vs WEIGHT)", () => {
    expect(() => assertCompatibleUnits("PCS", "KILOGRAM")).toThrow(IncompatibleUnitError);
  });

  it("mengizinkan satuan dalam family yang sama (gram vs kilogram)", () => {
    expect(() => assertCompatibleUnits("GRAM", "KILOGRAM")).not.toThrow();
  });

  it("assertSameFamily melempar IncompatibleUnitError yang membawa info family", () => {
    try {
      assertSameFamily("WEIGHT", "VOLUME");
      throw new Error("Seharusnya melempar IncompatibleUnitError");
    } catch (error) {
      expect(error).toBeInstanceOf(IncompatibleUnitError);
      expect((error as IncompatibleUnitError).fromFamily).toBe("WEIGHT");
      expect((error as IncompatibleUnitError).toFamily).toBe("VOLUME");
    }
  });
});

import { describe, expect, it } from "vitest";
import { calculatePricePerBaseUnit } from "@/lib/domain/pricing/unit-price";
import { InvalidQuantityError, InvalidMoneyError } from "@/lib/domain/errors/domain-errors";

describe("calculatePricePerBaseUnit", () => {
  it("kasus uji #1: Rp375.000 untuk 25 kg = Rp15.000/kg", () => {
    expect(calculatePricePerBaseUnit(375_000, 25).toNumber()).toBe(15_000);
  });

  it("kasus uji #2: Rp204.000 untuk 12 liter = Rp17.000/liter", () => {
    expect(calculatePricePerBaseUnit(204_000, 12).toNumber()).toBe(17_000);
  });

  it("kasus uji #3: Rp240.000 untuk 24 pcs = Rp10.000/pcs", () => {
    expect(calculatePricePerBaseUnit(240_000, 24).toNumber()).toBe(10_000);
  });

  it("menolak total isi kemasan nol atau negatif", () => {
    expect(() => calculatePricePerBaseUnit(100_000, 0)).toThrow(InvalidQuantityError);
    expect(() => calculatePricePerBaseUnit(100_000, -1)).toThrow(InvalidQuantityError);
  });

  it("menolak harga negatif", () => {
    expect(() => calculatePricePerBaseUnit(-1, 10)).toThrow(InvalidMoneyError);
  });

  it("menerima harga nol (hasil nol per satuan)", () => {
    expect(calculatePricePerBaseUnit(0, 10).toNumber()).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { resolvePackage } from "@/lib/domain/units/packaging";
import { InvalidQuantityError } from "@/lib/domain/errors/domain-errors";

describe("resolvePackage — struktur kemasan (poin 4 Tahap 2)", () => {
  it("1 karung beras 25 kg -> total isi 25 kg (family WEIGHT)", () => {
    const result = resolvePackage({
      packagingType: "KARUNG",
      itemsPerPackage: 1,
      contentPerItem: 25,
      contentUnit: "KILOGRAM",
    });

    expect(result.family).toBe("WEIGHT");
    expect(result.baseUnit).toBe("KILOGRAM");
    expect(result.totalContentInBaseUnit.toNumber()).toBe(25);
  });

  it("1 dus minyak = 12 botol x 1 liter -> total isi 12 liter (family VOLUME)", () => {
    const result = resolvePackage({
      packagingType: "DUS",
      itemsPerPackage: 12,
      contentPerItem: 1,
      contentUnit: "LITER",
    });

    expect(result.family).toBe("VOLUME");
    expect(result.baseUnit).toBe("LITER");
    expect(result.totalContentInBaseUnit.toNumber()).toBe(12);
  });

  it("1 dus barang = 24 pcs -> total isi 24 pcs (family COUNT)", () => {
    const result = resolvePackage({
      packagingType: "DUS",
      itemsPerPackage: 24,
      contentPerItem: 1,
      contentUnit: "PCS",
    });

    expect(result.family).toBe("COUNT");
    expect(result.baseUnit).toBe("PCS");
    expect(result.totalContentInBaseUnit.toNumber()).toBe(24);
  });

  it("mengonversi isi per barang dalam satuan non-basis (gram) dengan benar", () => {
    // 1 pak berisi 10 bungkus x 500 gram = 5 kg
    const result = resolvePackage({
      packagingType: "PAK",
      itemsPerPackage: 10,
      contentPerItem: 500,
      contentUnit: "GRAM",
    });

    expect(result.totalContentInBaseUnit.toNumber()).toBe(5);
  });

  it("menolak jumlah barang dalam kemasan nol atau negatif", () => {
    expect(() =>
      resolvePackage({
        packagingType: "BOX",
        itemsPerPackage: 0,
        contentPerItem: 1,
        contentUnit: "PCS",
      }),
    ).toThrow(InvalidQuantityError);

    expect(() =>
      resolvePackage({
        packagingType: "BOX",
        itemsPerPackage: -2,
        contentPerItem: 1,
        contentUnit: "PCS",
      }),
    ).toThrow(InvalidQuantityError);
  });

  it("menolak isi per barang nol atau negatif", () => {
    expect(() =>
      resolvePackage({
        packagingType: "BOTOL",
        itemsPerPackage: 1,
        contentPerItem: 0,
        contentUnit: "LITER",
      }),
    ).toThrow(InvalidQuantityError);

    expect(() =>
      resolvePackage({
        packagingType: "BOTOL",
        itemsPerPackage: 1,
        contentPerItem: -1,
        contentUnit: "LITER",
      }),
    ).toThrow(InvalidQuantityError);
  });
});

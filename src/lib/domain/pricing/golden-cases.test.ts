import { describe, expect, it } from "vitest";
import { resolvePackage } from "@/lib/domain/units/packaging";
import { calculatePricePerBaseUnit } from "@/lib/domain/pricing/unit-price";
import { calculateSubtotal } from "@/lib/domain/pricing/subtotal";

/**
 * Golden test wajib (R06 / SPEC.md, kasus uji #1-#3 Tahap 2). Menguji
 * pipa perhitungan end-to-end: struktur kemasan -> konversi ke satuan
 * dasar -> harga per satuan dasar, memakai contoh yang eksplisit
 * disebutkan pada spesifikasi.
 */
describe("Golden cases R06 — konversi kemasan ke harga per satuan dasar", () => {
  it("kasus uji #1: 1 karung beras 25 kg seharga Rp375.000 -> Rp15.000/kg", () => {
    const pkg = resolvePackage({
      packagingType: "KARUNG",
      itemsPerPackage: 1,
      contentPerItem: 25,
      contentUnit: "KILOGRAM",
    });

    expect(pkg.totalContentInBaseUnit.toNumber()).toBe(25);

    const pricePerUnit = calculatePricePerBaseUnit(375_000, pkg.totalContentInBaseUnit);
    expect(pricePerUnit.toNumber()).toBe(15_000);
  });

  it("kasus uji #2: 1 dus minyak = 12 botol x 1 liter seharga Rp204.000 -> Rp17.000/liter", () => {
    const pkg = resolvePackage({
      packagingType: "DUS",
      itemsPerPackage: 12,
      contentPerItem: 1,
      contentUnit: "LITER",
    });

    expect(pkg.totalContentInBaseUnit.toNumber()).toBe(12);

    const pricePerUnit = calculatePricePerBaseUnit(204_000, pkg.totalContentInBaseUnit);
    expect(pricePerUnit.toNumber()).toBe(17_000);
  });

  it("kasus uji #3: 1 dus barang = 24 pcs seharga Rp240.000 -> Rp10.000/pcs", () => {
    const pkg = resolvePackage({
      packagingType: "DUS",
      itemsPerPackage: 24,
      contentPerItem: 1,
      contentUnit: "PCS",
    });

    expect(pkg.totalContentInBaseUnit.toNumber()).toBe(24);

    const pricePerUnit = calculatePricePerBaseUnit(240_000, pkg.totalContentInBaseUnit);
    expect(pricePerUnit.toNumber()).toBe(10_000);
  });

  it("golden case #1 tetap konsisten meski dihitung melalui alur subtotal (1 kemasan, tanpa pajak)", () => {
    const pkg = resolvePackage({
      packagingType: "KARUNG",
      itemsPerPackage: 1,
      contentPerItem: 25,
      contentUnit: "KILOGRAM",
    });

    const subtotal = calculateSubtotal({
      packagesToBuy: 1,
      pricePerPackage: 375_000,
      taxStatus: "NONE",
      taxRatePercent: 0,
    });

    const pricePerUnit = calculatePricePerBaseUnit(
      subtotal.subtotalAfterTax,
      pkg.totalContentInBaseUnit,
    );

    expect(pricePerUnit.toNumber()).toBe(15_000);
  });
});

import { describe, expect, it } from "vitest";
import { calculateSubtotal } from "@/lib/domain/pricing/subtotal";
import { InvalidQuantityError } from "@/lib/domain/errors/domain-errors";

describe("calculateSubtotal", () => {
  it("menghitung subtotal setelah pajak untuk beberapa kemasan (EXCLUDED)", () => {
    const result = calculateSubtotal({
      packagesToBuy: 3,
      pricePerPackage: 100_000,
      taxStatus: "EXCLUDED",
      taxRatePercent: 11,
    });

    expect(result.pricePerPackageAfterTax.toNumber()).toBe(111_000);
    expect(result.subtotalAfterTax.toNumber()).toBe(333_000);
  });

  it("menghitung subtotal untuk status NONE (tanpa pajak)", () => {
    const result = calculateSubtotal({
      packagesToBuy: 2,
      pricePerPackage: 15_000,
      taxStatus: "NONE",
      taxRatePercent: 0,
    });

    expect(result.subtotalAfterTax.toNumber()).toBe(30_000);
  });

  it("menghitung subtotal untuk status INCLUDED (harga akhir tidak berubah per kemasan)", () => {
    const result = calculateSubtotal({
      packagesToBuy: 4,
      pricePerPackage: 111_000,
      taxStatus: "INCLUDED",
      taxRatePercent: 11,
    });

    expect(result.pricePerPackageAfterTax.toNumber()).toBe(111_000);
    expect(result.subtotalAfterTax.toNumber()).toBe(444_000);
  });

  it("menolak jumlah kemasan nol atau negatif", () => {
    expect(() =>
      calculateSubtotal({
        packagesToBuy: 0,
        pricePerPackage: 10_000,
        taxStatus: "NONE",
        taxRatePercent: 0,
      }),
    ).toThrow(InvalidQuantityError);
  });
});

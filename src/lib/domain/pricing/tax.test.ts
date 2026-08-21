import { describe, expect, it } from "vitest";
import { calculateTax } from "@/lib/domain/pricing/tax";
import { InvalidMoneyError } from "@/lib/domain/errors/domain-errors";

describe("calculateTax", () => {
  it("kasus uji #13: status NONE tidak terkena pajak sama sekali", () => {
    const result = calculateTax({
      taxStatus: "NONE",
      pricePerPackage: 100_000,
      taxRatePercent: 11,
    });

    expect(result.priceBeforeTax.toNumber()).toBe(100_000);
    expect(result.taxAmount.toNumber()).toBe(0);
    expect(result.priceAfterTax.toNumber()).toBe(100_000);
  });

  it("kasus uji #13b: tarif pajak diabaikan untuk NONE meski diisi angka aneh", () => {
    const result = calculateTax({
      taxStatus: "NONE",
      pricePerPackage: 50_000,
      taxRatePercent: 999,
    });
    expect(result.priceAfterTax.toNumber()).toBe(50_000);
  });

  it("kasus uji #12: status EXCLUDED menambahkan pajak sesuai tarif", () => {
    const result = calculateTax({
      taxStatus: "EXCLUDED",
      pricePerPackage: 100_000,
      taxRatePercent: 11,
    });

    expect(result.priceBeforeTax.toNumber()).toBe(100_000);
    expect(result.taxAmount.toNumber()).toBe(11_000);
    expect(result.priceAfterTax.toNumber()).toBe(111_000);
  });

  it("kasus uji #11: status INCLUDED tidak menambahkan pajak lagi (harga akhir tetap sama)", () => {
    const result = calculateTax({
      taxStatus: "INCLUDED",
      pricePerPackage: 111_000,
      taxRatePercent: 11,
    });

    expect(result.priceAfterTax.toNumber()).toBe(111_000);
    // Harga sebelum pajak dihitung mundur, bukan diabaikan.
    expect(result.priceBeforeTax.toNumber()).toBeCloseTo(100_000, 5);
    expect(result.taxAmount.toNumber()).toBeCloseTo(11_000, 5);
  });

  it("tarif pajak 0% menghasilkan nilai pajak nol untuk EXCLUDED/INCLUDED", () => {
    const excluded = calculateTax({
      taxStatus: "EXCLUDED",
      pricePerPackage: 50_000,
      taxRatePercent: 0,
    });
    expect(excluded.taxAmount.toNumber()).toBe(0);
    expect(excluded.priceAfterTax.toNumber()).toBe(50_000);

    const included = calculateTax({
      taxStatus: "INCLUDED",
      pricePerPackage: 50_000,
      taxRatePercent: 0,
    });
    expect(included.taxAmount.toNumber()).toBe(0);
    expect(included.priceBeforeTax.toNumber()).toBe(50_000);
  });

  it("menolak harga per kemasan negatif", () => {
    expect(() =>
      calculateTax({ taxStatus: "EXCLUDED", pricePerPackage: -1, taxRatePercent: 11 }),
    ).toThrow(InvalidMoneyError);
  });

  it("menolak tarif pajak negatif (tidak boleh di-hardcode & wajib divalidasi)", () => {
    expect(() =>
      calculateTax({ taxStatus: "EXCLUDED", pricePerPackage: 10_000, taxRatePercent: -5 }),
    ).toThrow(InvalidMoneyError);
  });

  it("menerima harga nol (mis. produk promo gratis)", () => {
    const result = calculateTax({ taxStatus: "EXCLUDED", pricePerPackage: 0, taxRatePercent: 11 });
    expect(result.priceAfterTax.toNumber()).toBe(0);
  });
});

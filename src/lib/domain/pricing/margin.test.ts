import { describe, expect, it } from "vitest";
import { computeCheapestBuyPricePerBaseUnit, computeMargin } from "@/lib/domain/pricing/margin";

describe("computeMargin", () => {
  it("jual 13.500, beli 12.000 → margin Rp1.500 (12,5%)", () => {
    const margin = computeMargin({ sellPricePerBaseUnit: 13500, buyPricePerBaseUnit: 12000 });
    expect(margin).not.toBeNull();
    expect(margin!.amount.toNumber()).toBe(1500);
    expect(margin!.percent?.toNumber()).toBeCloseTo(12.5, 10);
  });

  it("jual di bawah beli → margin negatif tampil apa adanya", () => {
    const margin = computeMargin({ sellPricePerBaseUnit: 11000, buyPricePerBaseUnit: 12000 });
    expect(margin).not.toBeNull();
    expect(margin!.amount.toNumber()).toBe(-1000);
    expect(margin!.percent?.toNumber()).toBeCloseTo(-8.333333, 4);
  });

  it("harga jual sama dengan beli → margin 0 (0%)", () => {
    const margin = computeMargin({ sellPricePerBaseUnit: 12000, buyPricePerBaseUnit: 12000 });
    expect(margin).not.toBeNull();
    expect(margin!.amount.toNumber()).toBe(0);
    expect(margin!.percent?.toNumber()).toBe(0);
  });

  it("harga jual belum diatur → tidak ada margin (bukan 0)", () => {
    expect(computeMargin({ sellPricePerBaseUnit: null, buyPricePerBaseUnit: 12000 })).toBeNull();
    expect(
      computeMargin({ sellPricePerBaseUnit: undefined, buyPricePerBaseUnit: 12000 }),
    ).toBeNull();
  });

  it("harga beli belum ada → tidak ada margin (bukan 0)", () => {
    expect(computeMargin({ sellPricePerBaseUnit: 13500, buyPricePerBaseUnit: null })).toBeNull();
  });

  it("harga beli 0 → jumlah margin tetap dihitung, persen null (hindari bagi nol)", () => {
    const margin = computeMargin({ sellPricePerBaseUnit: 13500, buyPricePerBaseUnit: 0 });
    expect(margin).not.toBeNull();
    expect(margin!.amount.toNumber()).toBe(13500);
    expect(margin!.percent).toBeNull();
  });
});

describe("computeCheapestBuyPricePerBaseUnit", () => {
  const offer = (pricePerPackage: number, totalPackageContent: number, supplierName: string) => ({
    pricePerPackage,
    taxStatus: "NONE" as const,
    taxRatePercent: 0,
    totalPackageContent,
    supplierName,
  });

  it("mengambil harga per satuan dasar termurah (bukan harga kemasan termurah)", () => {
    // Karung 5 kg Rp60.000 = Rp12.000/kg vs Karung 10 kg Rp130.000 = Rp13.000/kg:
    // kemasan termurah (60rb) sekaligus yang termurah per kg.
    const cheapest = computeCheapestBuyPricePerBaseUnit([
      offer(60000, 5, "Supplier A"),
      offer(130000, 10, "Supplier B"),
    ]);
    expect(cheapest).not.toBeNull();
    expect(cheapest!.pricePerBaseUnit.toNumber()).toBe(12000);
    expect(cheapest!.supplierName).toBe("Supplier A");
  });

  it("kemasan mahal bisa lebih murah per satuan dasar", () => {
    const cheapest = computeCheapestBuyPricePerBaseUnit([
      offer(60000, 5, "Supplier A"),
      offer(100000, 10, "Supplier B"),
    ]);
    expect(cheapest).not.toBeNull();
    expect(cheapest!.pricePerBaseUnit.toNumber()).toBe(10000);
    expect(cheapest!.supplierName).toBe("Supplier B");
  });

  it("pajak INCLUDED tidak ditambah lagi (harga sudah termasuk pajak)", () => {
    const cheapest = computeCheapestBuyPricePerBaseUnit([
      {
        pricePerPackage: 66000,
        taxStatus: "INCLUDED" as const,
        taxRatePercent: 10,
        totalPackageContent: 5,
        supplierName: "Supplier Pajak",
      },
    ]);
    // 66.000 sudah termasuk pajak 10% → harga akhir tetap 66.000 → 13.200/kg.
    expect(cheapest).not.toBeNull();
    expect(cheapest!.pricePerBaseUnit.toNumber()).toBe(13200);
  });

  it("pajak EXCLUDED ditambahkan ke harga", () => {
    const cheapest = computeCheapestBuyPricePerBaseUnit([
      {
        pricePerPackage: 60000,
        taxStatus: "EXCLUDED" as const,
        taxRatePercent: 10,
        totalPackageContent: 5,
        supplierName: "Supplier Pajak",
      },
    ]);
    // 60.000 belum termasuk pajak 10% → harga akhir 66.000 → 13.200/kg.
    expect(cheapest).not.toBeNull();
    expect(cheapest!.pricePerBaseUnit.toNumber()).toBe(13200);
  });

  it("tidak ada penawaran → null", () => {
    expect(computeCheapestBuyPricePerBaseUnit([])).toBeNull();
  });
});

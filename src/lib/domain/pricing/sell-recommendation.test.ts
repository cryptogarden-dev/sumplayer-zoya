import { describe, expect, it } from "vitest";
import {
  computeSellPricePerBaseUnit,
  computeSellRecommendation,
  computeSuggestedSellPrice,
} from "@/lib/domain/pricing/sell-recommendation";

describe("computeSellRecommendation", () => {
  it("Teh Gelas: beli 20.000/dus isi 24 cup, jual 1.000/cup → untung 4.000/dus (20%)", () => {
    const result = computeSellRecommendation({
      buyPricePerPackage: 20000,
      contentsPerPackage: 24,
      sellPricePerSellUnit: 1000,
    });
    expect(result.buyPricePerSellUnit.toNumber()).toBeCloseTo(833.333333, 4);
    expect(result.revenuePerPackage.toNumber()).toBe(24000);
    expect(result.profitPerPackage.toNumber()).toBe(4000);
    expect(result.profitPerSellUnit.toNumber()).toBeCloseTo(166.666667, 4);
    expect(result.profitPercent?.toNumber()).toBeCloseTo(20, 10);
  });

  it("Beras: beli 60.000/karung isi 5 kg, jual 13.500/kg → untung 7.500/karung (12,5%)", () => {
    const result = computeSellRecommendation({
      buyPricePerPackage: 60000,
      contentsPerPackage: 5,
      sellPricePerSellUnit: 13500,
    });
    expect(result.buyPricePerSellUnit.toNumber()).toBe(12000);
    expect(result.revenuePerPackage.toNumber()).toBe(67500);
    expect(result.profitPerPackage.toNumber()).toBe(7500);
    expect(result.profitPerSellUnit.toNumber()).toBe(1500);
    expect(result.profitPercent?.toNumber()).toBeCloseTo(12.5, 10);
  });

  it("jual di bawah beli → untung negatif tampil apa adanya", () => {
    const result = computeSellRecommendation({
      buyPricePerPackage: 20000,
      contentsPerPackage: 24,
      sellPricePerSellUnit: 800,
    });
    expect(result.profitPerPackage.toNumber()).toBe(-800);
    expect(result.profitPercent?.toNumber()).toBeCloseTo(-4, 10);
  });

  it("harga beli 0 → untung = omzet, persen null (hindari bagi nol)", () => {
    const result = computeSellRecommendation({
      buyPricePerPackage: 0,
      contentsPerPackage: 24,
      sellPricePerSellUnit: 1000,
    });
    expect(result.profitPerPackage.toNumber()).toBe(24000);
    expect(result.profitPercent).toBeNull();
  });

  it("isi per kemasan 0 atau negatif → ditolak", () => {
    expect(() =>
      computeSellRecommendation({
        buyPricePerPackage: 20000,
        contentsPerPackage: 0,
        sellPricePerSellUnit: 1000,
      }),
    ).toThrow();
    expect(() =>
      computeSellRecommendation({
        buyPricePerPackage: 20000,
        contentsPerPackage: -24,
        sellPricePerSellUnit: 1000,
      }),
    ).toThrow();
  });

  it("harga beli negatif → ditolak", () => {
    expect(() =>
      computeSellRecommendation({
        buyPricePerPackage: -20000,
        contentsPerPackage: 24,
        sellPricePerSellUnit: 1000,
      }),
    ).toThrow();
  });
});

describe("computeSuggestedSellPrice", () => {
  it("Teh Gelas target 20% → saran jual 1.000/cup", () => {
    const suggested = computeSuggestedSellPrice({
      buyPricePerPackage: 20000,
      contentsPerPackage: 24,
      targetMarginPercent: 20,
    });
    expect(suggested.toNumber()).toBeCloseTo(1000, 10);
  });

  it("Beras target 15% → saran jual 13.800/kg", () => {
    const suggested = computeSuggestedSellPrice({
      buyPricePerPackage: 60000,
      contentsPerPackage: 5,
      targetMarginPercent: 15,
    });
    expect(suggested.toNumber()).toBe(13800);
  });

  it("target 0% → saran jual sama dengan harga beli per satuan", () => {
    const suggested = computeSuggestedSellPrice({
      buyPricePerPackage: 20000,
      contentsPerPackage: 24,
      targetMarginPercent: 0,
    });
    expect(suggested.toNumber()).toBeCloseTo(833.333333, 4);
  });

  it("target di bawah -100% → ditolak (harga jual jadi negatif)", () => {
    expect(() =>
      computeSuggestedSellPrice({
        buyPricePerPackage: 20000,
        contentsPerPackage: 24,
        targetMarginPercent: -101,
      }),
    ).toThrow();
  });
});

describe("computeSellPricePerBaseUnit", () => {
  it("satuan jual = satuan dasar (kg) → harga dipakai apa adanya", () => {
    const perBaseUnit = computeSellPricePerBaseUnit({
      sellPricePerSellUnit: 13800,
      contentsPerPackage: 5,
      sellUnitLabel: "kg",
      baseUnitLabel: "kg",
    });
    expect(perBaseUnit.toNumber()).toBe(13800);
  });

  it("satuan jual beda (cup vs pcs) → dikali isi: 1.000 × 24 = 24.000/pcs", () => {
    const perBaseUnit = computeSellPricePerBaseUnit({
      sellPricePerSellUnit: 1000,
      contentsPerPackage: 24,
      sellUnitLabel: "cup",
      baseUnitLabel: "pcs",
    });
    expect(perBaseUnit.toNumber()).toBe(24000);
  });

  it("perbandingan label tidak peka huruf besar/kecil", () => {
    const perBaseUnit = computeSellPricePerBaseUnit({
      sellPricePerSellUnit: 13500,
      contentsPerPackage: 5,
      sellUnitLabel: "KG",
      baseUnitLabel: "kg",
    });
    expect(perBaseUnit.toNumber()).toBe(13500);
  });

  it("hasil pecahan dibulatkan ke Rupiah bulat (half up)", () => {
    // Target 25% untuk Teh Gelas: 833,333 × 1,25 = 1.041,667/cup → × 24 = 25.000
    const perBaseUnit = computeSellPricePerBaseUnit({
      sellPricePerSellUnit: 1041.6666666666667,
      contentsPerPackage: 24,
      sellUnitLabel: "cup",
      baseUnitLabel: "pcs",
    });
    expect(perBaseUnit.toNumber()).toBe(25000);
  });
});

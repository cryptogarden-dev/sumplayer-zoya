import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import { attachPriceHistoryChanges } from "@/lib/domain/pricing/price-history";

function entry(
  date: string,
  supplierProductId: string,
  pricePerBaseUnit: number,
  source: "PENAWARAN" | "PEMBELIAN" = "PENAWARAN",
) {
  return {
    date: new Date(date),
    supplierProductId,
    pricePerBaseUnit: new Decimal(pricePerBaseUnit),
    source,
  };
}

describe("attachPriceHistoryChanges", () => {
  it("mengurutkan terbaru dulu dan menghitung naik/turun vs entri sebelumnya", () => {
    const rows = attachPriceHistoryChanges([
      entry("2026-11-13", "offer-a", 13000),
      entry("2026-11-10", "offer-a", 12000),
      entry("2026-11-11", "offer-a", 12500),
    ]);
    expect(rows.map((row) => row.pricePerBaseUnit.toNumber())).toEqual([13000, 12500, 12000]);
    // Terbaru (13 Nov): naik Rp500 dari 12.500 (4%).
    expect(rows[0]!.change?.direction).toBe("NAIK");
    expect(rows[0]!.change?.amountChange.toNumber()).toBe(500);
    expect(rows[0]!.change?.percentChange?.toNumber()).toBeCloseTo(4, 10);
    // 11 Nov: naik Rp500 dari 12.000.
    expect(rows[1]!.change?.direction).toBe("NAIK");
    expect(rows[1]!.change?.amountChange.toNumber()).toBe(500);
    // Baris pertama (10 Nov): tanpa pembanding.
    expect(rows[2]!.change).toBeNull();
  });

  it("turun dihitung negatif dengan arah TURUN", () => {
    const rows = attachPriceHistoryChanges([
      entry("2026-11-12", "offer-a", 11000),
      entry("2026-11-10", "offer-a", 12000),
    ]);
    expect(rows[0]!.change?.direction).toBe("TURUN");
    expect(rows[0]!.change?.amountChange.toNumber()).toBe(-1000);
    expect(rows[0]!.change?.percentChange?.toNumber()).toBeCloseTo(-8.333333, 4);
    expect(rows[1]!.change).toBeNull();
  });

  it("penawaran yang berbeda tidak saling jadi pembanding", () => {
    const rows = attachPriceHistoryChanges([
      entry("2026-11-12", "offer-b", 15000),
      entry("2026-11-10", "offer-a", 12000),
    ]);
    // Keduanya baris pertama untuk penawarannya masing-masing.
    expect(rows[0]!.change).toBeNull();
    expect(rows[1]!.change).toBeNull();
  });

  it("pembelian memakai pembanding penawaran yang sama", () => {
    const rows = attachPriceHistoryChanges([
      entry("2026-11-12", "offer-a", 12000, "PEMBELIAN"),
      entry("2026-11-10", "offer-a", 12000, "PENAWARAN"),
    ]);
    expect(rows[0]!.change?.direction).toBe("TETAP");
    expect(rows[0]!.change?.amountChange.toNumber()).toBe(0);
    expect(rows[1]!.change).toBeNull();
  });

  it("daftar kosong → kosong", () => {
    expect(attachPriceHistoryChanges([])).toEqual([]);
  });
});

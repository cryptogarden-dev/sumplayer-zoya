import { describe, expect, it } from "vitest";
import { calculatePriceChange } from "@/lib/domain/pricing/price-change";

describe("calculatePriceChange", () => {
  it("menghitung kenaikan harga dengan benar", () => {
    const result = calculatePriceChange({ oldPrice: 15000, newPrice: 17000 });
    expect(result.amountChange.toNumber()).toBe(2000);
    expect(result.percentChange?.toNumber()).toBeCloseTo(13.3333, 3);
    expect(result.direction).toBe("NAIK");
  });

  it("menghitung penurunan harga dengan benar", () => {
    const result = calculatePriceChange({ oldPrice: 20000, newPrice: 15000 });
    expect(result.amountChange.toNumber()).toBe(-5000);
    expect(result.percentChange?.toNumber()).toBeCloseTo(-25, 3);
    expect(result.direction).toBe("TURUN");
  });

  it("mengembalikan TETAP saat harga tidak berubah", () => {
    const result = calculatePriceChange({ oldPrice: 10000, newPrice: 10000 });
    expect(result.amountChange.toNumber()).toBe(0);
    expect(result.percentChange?.toNumber()).toBe(0);
    expect(result.direction).toBe("TETAP");
  });

  it("menghindari pembagian nol saat harga lama = 0", () => {
    const result = calculatePriceChange({ oldPrice: 0, newPrice: 10000 });
    expect(result.percentChange).toBeNull();
    expect(result.amountChange.toNumber()).toBe(10000);
    expect(result.direction).toBe("NAIK");
  });

  it("menolak harga negatif", () => {
    expect(() => calculatePriceChange({ oldPrice: -1, newPrice: 100 })).toThrow();
  });
});

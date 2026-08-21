import { describe, expect, it } from "vitest";
import { estimateOnTimeRate } from "@/lib/domain/performance/on-time-rate";
import { InvalidQuantityError } from "@/lib/domain/errors/domain-errors";
import { MIN_PERFORMANCE_SAMPLE_SIZE } from "@/lib/domain/recommendation/config";

describe("estimateOnTimeRate (R15)", () => {
  it("mengembalikan 50% dan 'belum tersedia' saat completedCount = 0 (tidak boleh dianggap 0% atau rating asli)", () => {
    const result = estimateOnTimeRate({ onTimeCount: 0, completedCount: 0 });
    expect(result.rate.toNumber()).toBeCloseTo(0.5, 10);
    expect(result.ratePercent).toBe(50);
    expect(result.hasHistory).toBe(false);
    expect(result.hasEnoughData).toBe(false);
    expect(result.message).toMatch(/belum tersedia/i);
  });

  it("rumus (onTime+1)/(completed+2) — contoh 17 tepat waktu dari 20 pesanan", () => {
    const result = estimateOnTimeRate({ onTimeCount: 17, completedCount: 20 });
    // (17+1)/(20+2) = 18/22 = 0.8181...
    expect(result.rate.toNumber()).toBeCloseTo(18 / 22, 10);
    expect(result.ratePercent).toBe(82);
  });

  it("selalu menyertakan jumlah data pendukung pada teks (transparansi R15)", () => {
    const result = estimateOnTimeRate({ onTimeCount: 17, completedCount: 20 });
    expect(result.message).toContain("20 pengiriman");
  });

  it("menandai 'data masih terbatas' saat jumlah selesai di bawah ambang minimum", () => {
    const belowThreshold = MIN_PERFORMANCE_SAMPLE_SIZE - 1;
    const result = estimateOnTimeRate({
      onTimeCount: belowThreshold,
      completedCount: belowThreshold,
    });
    expect(result.hasHistory).toBe(true);
    expect(result.hasEnoughData).toBe(false);
    expect(result.message).toMatch(/data masih terbatas/i);
    expect(result.message).toContain(`${belowThreshold} pengiriman`);
  });

  it("menandai 'cukup data' saat jumlah selesai mencapai ambang minimum", () => {
    const result = estimateOnTimeRate({
      onTimeCount: MIN_PERFORMANCE_SAMPLE_SIZE,
      completedCount: MIN_PERFORMANCE_SAMPLE_SIZE,
    });
    expect(result.hasEnoughData).toBe(true);
    expect(result.message).toMatch(/estimasi tepat waktu/i);
  });

  it("menolak jumlah tepat waktu lebih besar dari jumlah selesai", () => {
    expect(() => estimateOnTimeRate({ onTimeCount: 5, completedCount: 3 })).toThrow(
      InvalidQuantityError,
    );
  });

  it("menolak nilai negatif", () => {
    expect(() => estimateOnTimeRate({ onTimeCount: -1, completedCount: 3 })).toThrow(
      InvalidQuantityError,
    );
    expect(() => estimateOnTimeRate({ onTimeCount: 1, completedCount: -3 })).toThrow(
      InvalidQuantityError,
    );
  });
});

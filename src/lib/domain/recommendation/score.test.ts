import { describe, expect, it } from "vitest";
import { scoreCandidates } from "@/lib/domain/recommendation/score";
import { RECOMMENDATION_WEIGHTS } from "@/lib/domain/recommendation/config";

describe("scoreCandidates (R14)", () => {
  it("kandidat dengan biaya termurah, keandalan tertinggi, dan tercepat mendapat skor tertinggi", () => {
    const results = scoreCandidates([
      { id: "murah-cepat-andal", totalCost: 100_000, reliability: 1, speedDays: 1 },
      { id: "mahal-lambat-kurang-andal", totalCost: 200_000, reliability: 0.5, speedDays: 5 },
    ]);

    const best = results.find((r) => r.id === "murah-cepat-andal")!;
    const worst = results.find((r) => r.id === "mahal-lambat-kurang-andal")!;
    expect(best.score).toBeGreaterThan(worst.score);
    expect(best.score).toBeCloseTo(1, 10);
    expect(worst.score).toBeCloseTo(0, 10);
  });

  it("total biaya null (ongkir belum diketahui) diperlakukan sebagai kandidat TERBURUK, bukan netral", () => {
    const results = scoreCandidates([
      { id: "diketahui", totalCost: 100_000, reliability: 0.5, speedDays: 2 },
      { id: "tidak-diketahui", totalCost: null, reliability: 0.5, speedDays: 2 },
    ]);

    const known = results.find((r) => r.id === "diketahui")!;
    const unknown = results.find((r) => r.id === "tidak-diketahui")!;
    expect(unknown.breakdown.totalCostScore).toBe(0);
    expect(known.score).toBeGreaterThan(unknown.score);
  });

  it("estimasi kecepatan null diperlakukan sebagai kandidat terburuk untuk komponen kecepatan", () => {
    const results = scoreCandidates([
      { id: "cepat", totalCost: 100_000, reliability: 0.5, speedDays: 1 },
      { id: "tidak-diketahui", totalCost: 100_000, reliability: 0.5, speedDays: null },
    ]);
    const unknown = results.find((r) => r.id === "tidak-diketahui")!;
    expect(unknown.breakdown.speedScore).toBe(0);
  });

  it("bobot yang dipakai konsisten dengan konfigurasi terpusat (total = 1)", () => {
    const total =
      RECOMMENDATION_WEIGHTS.totalCost +
      RECOMMENDATION_WEIGHTS.reliability +
      RECOMMENDATION_WEIGHTS.speed;
    expect(total).toBeCloseTo(1, 10);
  });

  it("nilai identik di seluruh kandidat menghasilkan skor yang sama (tidak ada favoritisme tanpa dasar)", () => {
    const results = scoreCandidates([
      { id: "a", totalCost: 100_000, reliability: 0.7, speedDays: 2 },
      { id: "b", totalCost: 100_000, reliability: 0.7, speedDays: 2 },
    ]);
    expect(results[0]!.score).toBeCloseTo(results[1]!.score, 10);
  });
});

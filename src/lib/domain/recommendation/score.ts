import { Decimal } from "decimal.js";
import { RECOMMENDATION_WEIGHTS } from "@/lib/domain/recommendation/config";

/**
 * Skor rekomendasi transparan (Tahap 4, R14): kombinasi berbobot dari
 * total biaya, keandalan (ketepatan waktu ATAU proksi ketersediaan), dan
 * kecepatan pengiriman — bobot terpusat di
 * `src/lib/domain/recommendation/config.ts`.
 *
 * Skor bersifat RELATIF terhadap kandidat yang sedang dibandingkan
 * (dinormalisasi min-max pada saat itu), BUKAN skor absolut/rating baku,
 * sesuai kebutuhan "skor transparan" (R14) tanpa membuat rating palsu.
 */
export interface ScoreCandidate {
  id: string;
  /** Total biaya (subtotal + ongkir). `null` = belum diketahui (ongkir perlu konfirmasi) -> diperlakukan sebagai kandidat terburuk. */
  totalCost: Decimal.Value | null;
  /** Skor keandalan 0..1 (rate ketepatan waktu ATAU proksi ketersediaan). */
  reliability: number;
  /** Estimasi total hari sampai tiba (maksimum). `null` = tidak diketahui -> diperlakukan sebagai kandidat terburuk. */
  speedDays: number | null;
}

export interface ScoreResult {
  id: string;
  score: number;
  breakdown: {
    totalCostScore: number;
    reliabilityScore: number;
    speedScore: number;
  };
}

/**
 * Normalisasi min-max ke rentang 0..1 di mana nilai LEBIH KECIL lebih
 * baik (biaya, jumlah hari). `null` selalu mendapat skor 0 (terburuk).
 * Jika seluruh nilai yang diketahui sama (tidak ada variasi), seluruhnya
 * mendapat skor netral (1) karena tidak ada dasar untuk membedakan.
 */
function normalizeLowerIsBetter(values: readonly (number | null)[]): number[] {
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) {
    return values.map(() => 0);
  }

  const min = Math.min(...known);
  const max = Math.max(...known);

  if (max === min) {
    return values.map((v) => (v === null ? 0 : 1));
  }

  return values.map((v) => (v === null ? 0 : (max - v) / (max - min)));
}

function normalizeHigherIsBetter(values: readonly number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {
    return values.map(() => 1);
  }

  return values.map((v) => (v - min) / (max - min));
}

export function scoreCandidates(candidates: readonly ScoreCandidate[]): ScoreResult[] {
  const costValues = candidates.map((c) =>
    c.totalCost === null ? null : new Decimal(c.totalCost).toNumber(),
  );
  const speedValues = candidates.map((c) => c.speedDays);

  const costScores = normalizeLowerIsBetter(costValues);
  const speedScores = normalizeLowerIsBetter(speedValues);
  const reliabilityScores = normalizeHigherIsBetter(candidates.map((c) => c.reliability));

  return candidates.map((candidate, index) => {
    const totalCostScore = costScores[index] ?? 0;
    const reliabilityScore = reliabilityScores[index] ?? 0;
    const speedScore = speedScores[index] ?? 0;

    const score =
      totalCostScore * RECOMMENDATION_WEIGHTS.totalCost +
      reliabilityScore * RECOMMENDATION_WEIGHTS.reliability +
      speedScore * RECOMMENDATION_WEIGHTS.speed;

    return {
      id: candidate.id,
      score,
      breakdown: { totalCostScore, reliabilityScore, speedScore },
    };
  });
}

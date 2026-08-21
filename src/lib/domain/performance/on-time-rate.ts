import { Decimal } from "decimal.js";
import { InvalidQuantityError } from "@/lib/domain/errors/domain-errors";
import { MIN_PERFORMANCE_SAMPLE_SIZE } from "@/lib/domain/recommendation/config";

/**
 * Estimasi ketepatan waktu pengiriman supplier (Tahap 4, R15 — dipindahkan
 * dari Tahap 2, lihat `docs/IMPLEMENTATION_PLAN.md`).
 *
 * Rumus (R15):
 *   onTimeRate = (jumlahTepatWaktu + 1) / (jumlahPesananSelesai + 2)
 *
 * "+1/+2" (Laplace smoothing sederhana) SENGAJA dipakai agar rate tidak
 * pernah tepat 0% atau 100% hanya dari sedikit data, dan tetap terdefinisi
 * saat `completedCount = 0` (menghasilkan 50%, dengan catatan tegas bahwa
 * ini BUKAN rating sungguhan — lihat `message`).
 *
 * Modul ini TIDAK PERNAH membuat data pengiriman palsu: jika belum ada
 * riwayat sama sekali (`completedCount = 0`), pemanggil WAJIB menampilkan
 * "Data pengiriman belum tersedia" (lihat `hasHistory`/`message`), bukan
 * persentase seolah itu penilaian nyata.
 */
export interface OnTimeRateInput {
  /** Jumlah pengiriman yang tercatat tepat waktu. */
  onTimeCount: number;
  /** Jumlah pesanan yang sudah selesai (diterima) — dasar perhitungan. */
  completedCount: number;
}

export interface OnTimeRateResult {
  /** Estimasi tingkat ketepatan waktu, 0..1. */
  rate: Decimal;
  /** Sama seperti `rate`, dibulatkan ke persen bulat untuk tampilan (0..100). */
  ratePercent: number;
  onTimeCount: number;
  completedCount: number;
  /** `true` jika ada minimal satu riwayat pengiriman selesai. */
  hasHistory: boolean;
  /** `true` jika jumlah riwayat sudah mencapai ambang "cukup data" (lihat config). */
  hasEnoughData: boolean;
  /** Teks transparan siap tampil — SELALU menyertakan jumlah data pendukung (R15). */
  message: string;
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new InvalidQuantityError(`${label} harus berupa bilangan bulat tidak negatif.`);
  }
}

export function estimateOnTimeRate(input: OnTimeRateInput): OnTimeRateResult {
  assertNonNegativeInteger(input.completedCount, "Jumlah pesanan selesai");
  assertNonNegativeInteger(input.onTimeCount, "Jumlah pengiriman tepat waktu");

  if (input.onTimeCount > input.completedCount) {
    throw new InvalidQuantityError(
      "Jumlah pengiriman tepat waktu tidak boleh lebih besar dari jumlah pesanan selesai.",
    );
  }

  const rate = new Decimal(input.onTimeCount)
    .plus(1)
    .div(new Decimal(input.completedCount).plus(2));
  const ratePercent = rate.mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

  const hasHistory = input.completedCount > 0;
  const hasEnoughData = input.completedCount >= MIN_PERFORMANCE_SAMPLE_SIZE;

  let message: string;
  if (!hasHistory) {
    message = "Data pengiriman belum tersedia — belum ada pesanan selesai yang tercatat.";
  } else if (!hasEnoughData) {
    message = `Data masih terbatas, berdasarkan ${input.completedCount} pengiriman.`;
  } else {
    message = `Estimasi tepat waktu ${ratePercent}%, berdasarkan ${input.completedCount} pengiriman.`;
  }

  return {
    rate,
    ratePercent,
    onTimeCount: input.onTimeCount,
    completedCount: input.completedCount,
    hasHistory,
    hasEnoughData,
    message,
  };
}

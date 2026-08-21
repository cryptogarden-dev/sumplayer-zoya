/**
 * Evaluasi "data freshness" (Tahap 3, poin 7): tampilkan tanggal terakhir
 * harga/stok diperbarui, dan beri peringatan bila sudah lama. Ambang
 * "lama" WAJIB dapat dikonfigurasi (`thresholdDays`, dari
 * `businesses.stale_data_threshold_days`), tidak boleh hardcode.
 *
 * Modul BARU untuk Tahap 3 (tidak ada di CALCULATION_ENGINE.md Tahap 2) -
 * fungsi murni agar komponen UI tidak menghitung ulang ambang batas ini
 * sendiri.
 */
export interface FreshnessInput {
  lastUpdatedAt: Date;
  thresholdDays: number;
  now?: Date;
}

export interface FreshnessResult {
  daysSinceUpdate: number;
  isStale: boolean;
  message: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function evaluateFreshness(input: FreshnessInput): FreshnessResult {
  const now = input.now ?? new Date();
  const diffMs = now.getTime() - input.lastUpdatedAt.getTime();
  const daysSinceUpdate = Math.max(0, Math.floor(diffMs / MS_PER_DAY));
  const isStale = daysSinceUpdate >= input.thresholdDays;

  const message = isStale
    ? `Data ini sudah ${daysSinceUpdate} hari tidak diperbarui. Disarankan konfirmasi ulang ke supplier.`
    : `Diperbarui ${daysSinceUpdate} hari yang lalu.`;

  return { daysSinceUpdate, isStale, message };
}

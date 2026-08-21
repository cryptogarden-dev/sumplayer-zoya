/**
 * Konfigurasi terpusat untuk mesin rekomendasi (Tahap 4, R13/R14) dan
 * ambang data performa (R15). SATU sumber kebenaran — jangan menyalin
 * angka-angka ini ke tempat lain (UI, service layer, dst). Jika bobot
 * perlu diubah, ubah HANYA di sini.
 */

/**
 * Bobot skor rekomendasi (R14). Total harus = 1.
 *
 * - `totalCost`: total biaya (subtotal + ongkir) — makin murah makin baik.
 * - `reliability`: ketepatan pengiriman historis (R15) BILA tersedia;
 *   jika riwayat pengiriman belum ada, bobot ini dipakai untuk skor
 *   proksi ketersediaan stok (lihat `AVAILABILITY_PROXY_SCORES` di bawah
 *   dan `src/lib/domain/recommendation/score.ts`) — sesuai instruksi:
 *   "Jika belum ada riwayat pengiriman: gunakan ketersediaan, total
 *   biaya, dan estimasi pengiriman."
 * - `speed`: estimasi lama pengiriman (hari sampai tiba) — makin cepat
 *   makin baik.
 */
export const RECOMMENDATION_WEIGHTS = {
  totalCost: 0.5,
  reliability: 0.3,
  speed: 0.2,
} as const;

/**
 * Jumlah minimum riwayat pengiriman selesai agar estimasi ketepatan waktu
 * (R15) dianggap "cukup data" (bukan "data masih terbatas"). Tidak
 * disebutkan angka pasti di SPEC.md — nilai ini adalah ambang default yang
 * masuk akal dan SENGAJA dipusatkan di sini agar mudah disesuaikan tanpa
 * mengubah rumus di `performance/on-time-rate.ts`.
 */
export const MIN_PERFORMANCE_SAMPLE_SIZE = 5;

/**
 * Skor proksi ketersediaan stok (0..1) dipakai SEBAGAI PENGGANTI skor
 * ketepatan waktu ketika riwayat pengiriman belum tersedia (lihat
 * `RECOMMENDATION_WEIGHTS.reliability`). Bukan rating/probabilitas palsu —
 * murni pemeringkatan berdasarkan kepastian & kecukupan stok yang sudah
 * dihitung `evaluateStock()` (Tahap 2).
 */
export const AVAILABILITY_PROXY_SCORES = {
  /** Stok mencukupi & statusnya pasti (mis. TERSEDIA/STOK_TERBATAS dgn jumlah cukup). */
  SUFFICIENT_AND_CERTAIN: 1,
  /** Stok mencukupi tetapi statusnya belum pasti. */
  SUFFICIENT_BUT_UNCERTAIN: 0.6,
  /** Stok tidak mencukupi/tidak pasti tapi bukan kosong (mis. PRE_ORDER, PERLU_KONFIRMASI). */
  INSUFFICIENT_UNCERTAIN: 0.3,
  /** Stok kosong atau dipastikan tidak mencukupi. */
  INSUFFICIENT_CERTAIN: 0,
} as const;

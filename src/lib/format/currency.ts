/**
 * Formatter mata uang Rupiah (R24 - lokalisasi). Hanya untuk PRESENTASI.
 * Perhitungan uang aktual (Tahap 2) wajib memakai tipe desimal presisi
 * tetap (lihat docs/ARCHITECTURE.md §6.1), bukan `number` biasa.
 */
const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number | string): string {
  const numeric = typeof amount === "string" ? Number(amount) : amount;

  if (!Number.isFinite(numeric)) {
    return rupiahFormatter.format(0);
  }

  return rupiahFormatter.format(numeric);
}

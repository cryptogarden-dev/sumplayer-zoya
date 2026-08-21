import type { StockEvaluation } from "@/lib/domain/pricing/stock";

/**
 * Aturan kelayakan supplier untuk direkomendasikan (Tahap 4, R14).
 *
 * Catatan penting (lihat instruksi Tahap 4):
 * - Kecocokan produk & kompatibilitas dimensi satuan divalidasi SATU KALI
 *   di level permintaan perbandingan (sebelum offer per-offer dievaluasi),
 *   bukan di sini — lihat `src/lib/server/comparison/build-comparison.ts`.
 * - Minimum & kelipatan pembelian SELALU dipenuhi secara konstruktif oleh
 *   `calculatePurchaseQuantity()` (Tahap 2, membulatkan ke atas), sehingga
 *   tidak pernah menjadi alasan penolakan di sini.
 * - Supplier yang tidak layak TETAP ditampilkan untuk perbandingan (tidak
 *   difilter otomatis) — hanya tidak boleh mendapat label "Direkomendasikan".
 */
export interface EligibilityInput {
  servesDestination: boolean | "UNKNOWN";
  stock: Pick<StockEvaluation, "meetsNeed" | "isCertain" | "reason">;
  arrivesInTime: boolean;
  /**
   * Catatan tambahan yang membuat kepastian berkurang (mis. harga/stok
   * sudah lama tidak diperbarui — lihat `freshness/data-freshness.ts`).
   * Diperlakukan sama seperti keraguan lain: TIDAK memblokir (bukan
   * `blockingReasons`), tetapi mencegah status "eligible" penuh.
   */
  additionalCautionNotes?: string[];
}

export interface EligibilityResult {
  /** `true` HANYA jika seluruh syarat terpenuhi dengan pasti (tanpa keraguan). */
  eligible: boolean;
  /** Alasan tegas yang membuat supplier ini TIDAK layak/tidak dapat dipesan. */
  blockingReasons: string[];
  /** Hal yang masih perlu dikonfirmasi, tetapi bukan penolakan tegas. */
  cautionNotes: string[];
}

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const blockingReasons: string[] = [];
  const cautionNotes: string[] = [];

  if (input.servesDestination === false) {
    blockingReasons.push("Supplier tidak melayani area tujuan pengiriman.");
  } else if (input.servesDestination === "UNKNOWN") {
    cautionNotes.push("Jangkauan area pengiriman supplier belum dikonfirmasi.");
  }

  if (!input.stock.meetsNeed) {
    if (input.stock.isCertain) {
      // Mis. KOSONG, atau STOK_TERBATAS dengan jumlah yang diketahui < kebutuhan.
      blockingReasons.push(input.stock.reason);
    } else {
      // Mis. PERLU_KONFIRMASI, PRE_ORDER, atau STOK_TERBATAS tanpa jumlah pasti.
      cautionNotes.push(input.stock.reason);
    }
  } else if (!input.stock.isCertain) {
    cautionNotes.push(`Kecukupan stok belum pasti — ${input.stock.reason}`);
  }

  if (!input.arrivesInTime) {
    blockingReasons.push("Estimasi tiba melebihi tanggal kebutuhan.");
  }

  for (const note of input.additionalCautionNotes ?? []) {
    cautionNotes.push(note);
  }

  return {
    eligible: blockingReasons.length === 0 && cautionNotes.length === 0,
    blockingReasons,
    cautionNotes,
  };
}

import type { EligibilityResult } from "@/lib/domain/recommendation/eligibility";
import { LABEL, type LabelText } from "@/lib/domain/recommendation/labels";

/**
 * Alasan transparan yang dapat dijelaskan (R14: "Alasan rekomendasi harus
 * ditampilkan sebagai teks"). Dibangun HANYA dari label/kondisi yang
 * benar-benar terpenuhi — tidak pernah membuat alasan yang tidak berdasar
 * data.
 */
const POSITIVE_LABEL_PHRASES: Partial<Record<LabelText, string>> = {
  [LABEL.CHEAPEST_UNIT_PRICE]: "harga per satuan termurah",
  [LABEL.CHEAPEST_TOTAL]: "total pembelian termurah",
  [LABEL.FREE_SHIPPING]: "gratis ongkir",
  [LABEL.FASTEST_DELIVERY]: "pengiriman tercepat",
  [LABEL.CLOSEST]: "lokasi paling dekat",
  [LABEL.STOCK_AVAILABLE]: "stok tersedia",
};

function joinWithDan(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} dan ${items[items.length - 1]}`;
}

export interface BuildReasonInput {
  eligible: boolean;
  isRecommended: boolean;
  labels: readonly LabelText[];
  eligibility: EligibilityResult;
  /** Teks estimasi ketepatan waktu (dari `estimateOnTimeRate().message`) — selalu disertakan (R15). */
  performanceMessage: string;
}

export function buildRecommendationReason(input: BuildReasonInput): string {
  const parts: string[] = [];

  if (input.isRecommended) {
    const positiveReasons = input.labels
      .map((label) => POSITIVE_LABEL_PHRASES[label])
      .filter((phrase): phrase is string => Boolean(phrase));

    if (positiveReasons.length > 0) {
      parts.push(`Direkomendasikan karena ${joinWithDan(positiveReasons)}.`);
    } else {
      parts.push(
        "Direkomendasikan berdasarkan kombinasi total biaya, ketepatan, dan kecepatan pengiriman terbaik secara keseluruhan.",
      );
    }
  } else if (input.eligibility.blockingReasons.length > 0) {
    parts.push(`Tidak direkomendasikan: ${input.eligibility.blockingReasons.join(" ")}`);
  } else if (input.eligibility.cautionNotes.length > 0) {
    parts.push(`Belum dapat direkomendasikan: ${input.eligibility.cautionNotes.join(" ")}`);
  } else {
    parts.push("Memenuhi syarat, namun bukan pilihan dengan skor tertinggi saat ini.");
  }

  parts.push(input.performanceMessage);

  return parts.join(" ");
}

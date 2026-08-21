import { Decimal } from "decimal.js";
import type { AvailabilityStatus } from "@/lib/domain/pricing/types";

/**
 * Label dinamis halaman Bandingkan (Tahap 4, R13). SELALU dihitung dari
 * data nyata pada saat render (lihat `LabelInputRow`), tidak pernah nilai
 * statis/hardcode per supplier.
 */
export const LABEL = {
  CHEAPEST_UNIT_PRICE: "Harga Satuan Termurah",
  CHEAPEST_TOTAL: "Total Pembelian Termurah",
  FREE_SHIPPING: "Gratis Ongkir",
  FASTEST_DELIVERY: "Pengiriman Tercepat",
  CLOSEST: "Paling Dekat",
  STOCK_AVAILABLE: "Stok Tersedia",
  STOCK_LIMITED: "Stok Terbatas",
  NEEDS_CONFIRMATION: "Perlu Konfirmasi",
  RECOMMENDED: "Direkomendasikan",
} as const;

export type LabelText = (typeof LABEL)[keyof typeof LABEL];

export interface LabelInputRow {
  id: string;
  /** Harga akhir per satuan dasar SETELAH pajak & ongkir. `null` = ongkir belum diketahui. */
  finalPricePerBaseUnit: Decimal.Value | null;
  /** Total biaya (subtotal setelah pajak + ongkir). `null` = ongkir belum diketahui. */
  totalCost: Decimal.Value | null;
  isFreeShipping: boolean;
  /** Estimasi tanggal tiba maksimum. `null` jika tidak dapat diperkirakan. */
  estimatedArrivalMax: Date | null;
  /** Skor kedekatan (lebih kecil = lebih dekat). `null` = tidak diketahui. */
  proximityScore: number | null;
  availabilityStatus: AvailabilityStatus;
  needsConfirmation: boolean;
  eligible: boolean;
  score: number;
}

function pickMinIds<T>(
  rows: readonly { id: string; value: T | null }[],
  compare: (a: T, b: T) => number,
): Set<string> {
  const known = rows.filter((r): r is { id: string; value: T } => r.value !== null);
  if (known.length === 0) return new Set();

  let bestValue = known[0]!.value;
  for (const row of known) {
    if (compare(row.value, bestValue) < 0) bestValue = row.value;
  }

  return new Set(known.filter((row) => compare(row.value, bestValue) === 0).map((row) => row.id));
}

function stockLabel(status: AvailabilityStatus): LabelText | null {
  switch (status) {
    case "TERSEDIA":
      return LABEL.STOCK_AVAILABLE;
    case "STOK_TERBATAS":
      return LABEL.STOCK_LIMITED;
    default:
      return null;
  }
}

/**
 * Menghitung label untuk seluruh baris hasil perbandingan sekaligus
 * (beberapa label bersifat relatif antar-supplier, mis. termurah).
 */
export function computeLabels(rows: readonly LabelInputRow[]): Map<string, LabelText[]> {
  const cheapestUnitPriceIds = pickMinIds(
    rows.map((r) => ({
      id: r.id,
      value: r.finalPricePerBaseUnit === null ? null : new Decimal(r.finalPricePerBaseUnit),
    })),
    (a, b) => a.comparedTo(b),
  );
  const cheapestTotalIds = pickMinIds(
    rows.map((r) => ({ id: r.id, value: r.totalCost === null ? null : new Decimal(r.totalCost) })),
    (a, b) => a.comparedTo(b),
  );
  const fastestIds = pickMinIds(
    rows.map((r) => ({
      id: r.id,
      value: r.estimatedArrivalMax === null ? null : r.estimatedArrivalMax.getTime(),
    })),
    (a, b) => a - b,
  );
  const closestIds = pickMinIds(
    rows.map((r) => ({ id: r.id, value: r.proximityScore })),
    (a, b) => a - b,
  );

  const eligibleRows = rows.filter((r) => r.eligible);
  const maxScore = eligibleRows.length > 0 ? Math.max(...eligibleRows.map((r) => r.score)) : null;
  const recommendedIds = new Set(
    maxScore === null
      ? []
      : eligibleRows.filter((r) => Math.abs(r.score - maxScore) < 1e-9).map((r) => r.id),
  );

  const result = new Map<string, LabelText[]>();

  for (const row of rows) {
    const labels: LabelText[] = [];

    if (cheapestUnitPriceIds.has(row.id)) labels.push(LABEL.CHEAPEST_UNIT_PRICE);
    if (cheapestTotalIds.has(row.id)) labels.push(LABEL.CHEAPEST_TOTAL);
    if (row.isFreeShipping) labels.push(LABEL.FREE_SHIPPING);
    if (fastestIds.has(row.id)) labels.push(LABEL.FASTEST_DELIVERY);
    if (closestIds.has(row.id)) labels.push(LABEL.CLOSEST);

    const stock = stockLabel(row.availabilityStatus);
    if (stock) labels.push(stock);

    if (row.needsConfirmation) labels.push(LABEL.NEEDS_CONFIRMATION);

    // R14 (poin 9 instruksi Tahap 4): hanya supplier LAYAK yang boleh
    // mendapat label "Direkomendasikan".
    if (row.eligible && recommendedIds.has(row.id)) labels.push(LABEL.RECOMMENDED);

    result.set(row.id, labels);
  }

  return result;
}

import { calculatePriceChange, type PriceChangeResult } from "@/lib/domain/pricing/price-change";
import type { Money } from "@/lib/domain/money/money";

/**
 * Penyusunan riwayat harga beli (perbaikan #5) — fungsi murni agar bisa
 * diuji tanpa database. Repository hanya mengambil data mentah lalu
 * memanggil fungsi ini.
 *
 * Aturan: urut kronologis menaik dulu untuk menghitung perubahan vs
 * entri sebelumnya dari PRODUK YANG SAMA (semua entri di sini memang
 * sudah milik satu produk — tidak peduli penawarannya berbeda atau
 * sumbernya Penawaran vs Pembelian); hanya baris paling awal dalam
 * seluruh riwayat produk itu yang tidak punya pembanding
 * (`change: null`). Hasil akhir diurutkan terbaru dulu.
 */
export interface PriceHistoryEntryBase {
  date: Date;
  supplierProductId: string;
  pricePerBaseUnit: Money;
  source: "PENAWARAN" | "PEMBELIAN";
}

export function attachPriceHistoryChanges<T extends PriceHistoryEntryBase>(
  entries: readonly T[],
): (T & { change: PriceChangeResult | null })[] {
  const sorted = [...entries].sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime();
    if (byDate !== 0) return byDate;
    return a.source === b.source ? 0 : a.source === "PENAWARAN" ? -1 : 1;
  });

  let previous: PriceHistoryEntryBase | null = null;
  const withChange = sorted.map((entry) => {
    const change = previous
      ? calculatePriceChange({
          oldPrice: previous.pricePerBaseUnit,
          newPrice: entry.pricePerBaseUnit,
        })
      : null;
    previous = entry;
    return { ...entry, change };
  });

  return withChange.reverse();
}

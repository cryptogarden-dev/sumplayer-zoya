import { Decimal } from "decimal.js";
import { money, type Money } from "@/lib/domain/money/money";

/**
 * Perhitungan perubahan harga antar entri riwayat harga (Tahap 3, poin 6:
 * "Tampilkan perubahan nominal dan persentase", "Hindari pembagian nol").
 *
 * Modul BARU untuk Tahap 3 (tidak ada di CALCULATION_ENGINE.md Tahap 2) -
 * tetap ditempatkan di `src/lib/domain` (fungsi murni, dapat diuji unit)
 * agar komponen UI riwayat harga TIDAK menghitung ulang rumus ini sendiri.
 */
export interface PriceChangeInput {
  oldPrice: Decimal.Value;
  newPrice: Decimal.Value;
}

export interface PriceChangeResult {
  amountChange: Money;
  /** Perubahan dalam persen. `null` jika harga lama = 0 (hindari pembagian nol). */
  percentChange: Decimal | null;
  direction: "NAIK" | "TURUN" | "TETAP";
}

export function calculatePriceChange(input: PriceChangeInput): PriceChangeResult {
  const oldPrice = money(input.oldPrice, "Harga lama");
  const newPrice = money(input.newPrice, "Harga baru");

  const amountChange = newPrice.minus(oldPrice);

  const percentChange = oldPrice.isZero() ? null : amountChange.div(oldPrice).mul(100);

  const direction = amountChange.isZero() ? "TETAP" : amountChange.isPositive() ? "NAIK" : "TURUN";

  return { amountChange, percentChange, direction };
}

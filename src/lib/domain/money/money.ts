import { Decimal } from "decimal.js";
import { InvalidMoneyError } from "@/lib/domain/errors/domain-errors";

/**
 * Representasi uang presisi tetap (R27, poin 12 Tahap 2).
 *
 * Seluruh aritmetika uang di domain module WAJIB memakai `Decimal` dari
 * `decimal.js`, TIDAK PERNAH operator `+ - * /` pada `number` biasa untuk
 * nilai uang. `Money` adalah alias semantik dari `Decimal` agar signature
 * fungsi lebih jelas menyatakan maksud (uang vs kuantitas biasa).
 *
 * Rupiah tidak memiliki subunit yang dipakai dalam praktik (tidak ada
 * "sen" yang beredar), sehingga presisi tampilan akhir dibulatkan ke
 * bilangan bulat (lihat `roundMoney`). Namun nilai yang DISIMPAN/DIHITUNG
 * secara internal (mis. harga per satuan dasar hasil pembagian) TIDAK
 * dibulatkan agar tidak kehilangan presisi pada perhitungan berantai —
 * pembulatan hanya terjadi di lapisan presentasi, sesuai
 * docs/ARCHITECTURE.md §6.1.
 */
export type Money = Decimal;

/**
 * Membungkus nilai menjadi `Money` yang tervalidasi: harus berupa angka
 * yang valid (finite) dan tidak boleh negatif. Nol tetap diperbolehkan
 * (mis. promo gratis ongkir/produk).
 */
export function money(value: Decimal.Value, label = "Nilai uang"): Money {
  const decimal = new Decimal(value);

  if (!decimal.isFinite()) {
    throw new InvalidMoneyError(`${label} harus berupa angka yang valid.`);
  }

  if (decimal.isNegative()) {
    throw new InvalidMoneyError(`${label} tidak boleh negatif.`);
  }

  return decimal;
}

/**
 * Aturan pembulatan uang yang terdokumentasi (kasus uji wajib #23):
 * dibulatkan ke jumlah desimal yang diminta (default 0 — bilangan bulat
 * Rupiah) memakai "round half up" (0,5 selalu dibulatkan ke atas), BUKAN
 * "round half to even" (banker's rounding). Contoh: 15000.5 → 15001,
 * 15000.4 → 15000, 2.5 → 3.
 *
 * Hanya dipakai di lapisan presentasi/output akhir, bukan pada nilai
 * antara yang masih akan dipakai untuk perhitungan lebih lanjut.
 */
export function roundMoney(value: Decimal.Value, decimalPlaces = 0): Money {
  return new Decimal(value).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
}

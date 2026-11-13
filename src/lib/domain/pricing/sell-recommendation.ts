import { Decimal } from "decimal.js";
import { money, roundMoney, type Money } from "@/lib/domain/money/money";
import { assertPositiveQuantity } from "@/lib/domain/units/convert";
import { InvalidMoneyError } from "@/lib/domain/errors/domain-errors";

/**
 * Rekomendasi harga jual (fitur "Rekomendasi Jual", 2026-11-13).
 *
 * Masalah yang dipecahkan: harga jual selama ini diisi manual per satuan
 * dasar, tanpa bantuan hitung dari harga beli. Padahal pola jual grosir
 * semi-eceran adalah beli per kemasan, jual per isi kemasan — mis. Teh
 * Gelas beli Rp20.000/dus isi 24 cup, jual Rp1.000/cup → untung Rp4.000
 * per dus (20%). Modul ini menghitung dua arah:
 *
 * 1. Diketahui harga jual per satuan jual → untung (Rp dan %) per kemasan
 *    dan per satuan jual.
 * 2. Diketahui target untung % → saran harga jual per satuan jual.
 *
 * "Satuan jual" boleh sama dengan satuan dasar produk (mis. jual Beras
 * per kg) atau lebih kecil (mis. jual Teh Gelas per cup, padahal satuan
 * dasarnya pcs = dus). Pembedaannya lewat label satuan yang diketik
 * pengguna — lihat `computeSellPricePerBaseUnit`.
 *
 * Persen untung dihitung terhadap harga beli (konsisten dengan
 * `computeMargin`): persen = untung / beli × 100. Harga beli yang masuk
 * ke sini adalah harga per kemasan SETELAH pajak (pemanggil menghitungnya
 * lewat `calculateSubtotal`, sama seperti margin).
 */

export interface SellRecommendationInput {
  /** Harga beli per kemasan setelah pajak. */
  buyPricePerPackage: Decimal.Value;
  /** Isi per kemasan dalam satuan jual (mis. 24 cup per dus). Harus > 0. */
  contentsPerPackage: Decimal.Value;
  /** Harga jual per satuan jual yang diinginkan. */
  sellPricePerSellUnit: Decimal.Value;
}

export interface SellRecommendationResult {
  /** Harga beli per satuan jual. */
  buyPricePerSellUnit: Money;
  /** Omzet bila satu kemasan habis terjual. */
  revenuePerPackage: Money;
  /** Untung per kemasan (boleh negatif bila jual < beli). */
  profitPerPackage: Money;
  /** Untung per satuan jual (boleh negatif). */
  profitPerSellUnit: Money;
  /** Persen untung terhadap harga beli. `null` bila harga beli 0. */
  profitPercent: Decimal | null;
}

/**
 * Hitung untung dari harga jual per satuan jual yang diketahui.
 * `null` tidak pernah dikembalikan — bila input tidak valid, lempar error
 * (pemanggil menampilkan pesannya), jangan tampilkan angka 0 yang
 * menyesatkan.
 */
export function computeSellRecommendation(
  input: SellRecommendationInput,
): SellRecommendationResult {
  const buyPerPackage = money(input.buyPricePerPackage, "Harga beli per kemasan");
  const sellPerUnit = money(input.sellPricePerSellUnit, "Harga jual per satuan");
  const contents = assertPositiveQuantity(input.contentsPerPackage, "Isi per kemasan");

  const buyPerSellUnit = buyPerPackage.div(contents);
  const revenuePerPackage = sellPerUnit.mul(contents);
  const profitPerPackage = revenuePerPackage.minus(buyPerPackage);
  const profitPerSellUnit = sellPerUnit.minus(buyPerSellUnit);
  const profitPercent = buyPerSellUnit.isZero()
    ? null
    : profitPerSellUnit.div(buyPerSellUnit).mul(100);

  return {
    buyPricePerSellUnit: buyPerSellUnit,
    revenuePerPackage,
    profitPerPackage,
    profitPerSellUnit,
    profitPercent,
  };
}

export interface SuggestedSellPriceInput {
  /** Harga beli per kemasan setelah pajak. */
  buyPricePerPackage: Decimal.Value;
  /** Isi per kemasan dalam satuan jual. Harus > 0. */
  contentsPerPackage: Decimal.Value;
  /** Target untung dalam persen terhadap harga beli (mis. 20 = 20%). */
  targetMarginPercent: Decimal.Value;
}

/**
 * Saran harga jual per satuan jual dari target untung %.
 * Target di bawah -100% tidak masuk akal (harga jual jadi negatif) dan
 * ditolak. Hasilnya harga jual per satuan jual — pemanggil mengalikannya
 * sendiri bila butuh harga per kemasan / per satuan dasar.
 */
export function computeSuggestedSellPrice(input: SuggestedSellPriceInput): Money {
  const buyPerPackage = money(input.buyPricePerPackage, "Harga beli per kemasan");
  const contents = assertPositiveQuantity(input.contentsPerPackage, "Isi per kemasan");
  const target = new Decimal(input.targetMarginPercent);
  if (!target.isFinite()) {
    throw new InvalidMoneyError("Target untung harus berupa angka yang valid.");
  }
  if (target.lessThan(-100)) {
    throw new InvalidMoneyError("Target untung tidak boleh di bawah -100%.");
  }

  const buyPerSellUnit = buyPerPackage.div(contents);
  return buyPerSellUnit.mul(new Decimal(1).plus(target.div(100)));
}

/**
 * Ubah harga jual per satuan jual menjadi harga jual per satuan dasar
 * produk — nilai yang disimpan ke `Product.sellPricePerBaseUnit` saat
 * pengguna menekan "Pakai sebagai Harga Jual".
 *
 * - Bila label satuan jual SAMA dengan label satuan dasar (mis. sama-sama
 *   "kg"): harga per satuan jual sudah sama dengan harga per satuan dasar.
 * - Bila BERBEDA (mis. jual per "cup", satuan dasar "pcs" = dus):
 *   harga per satuan dasar = harga per satuan jual × isi per kemasan
 *   (mis. Rp1.000/cup × 24 = Rp24.000/pcs).
 *
 * Perbandingan label tidak peka huruf besar/kecil dan spasi ujung.
 * Hasil dibulatkan ke Rupiah bulat (round half up) karena inilah nilai
 * akhir yang disimpan, bukan nilai antara.
 */
export function computeSellPricePerBaseUnit(input: {
  sellPricePerSellUnit: Decimal.Value;
  contentsPerPackage: Decimal.Value;
  sellUnitLabel: string;
  baseUnitLabel: string;
}): Money {
  const sellPerUnit = money(input.sellPricePerSellUnit, "Harga jual per satuan");
  const contents = assertPositiveQuantity(input.contentsPerPackage, "Isi per kemasan");

  const sameUnit =
    input.sellUnitLabel.trim().toLowerCase() === input.baseUnitLabel.trim().toLowerCase();

  const perBaseUnit = sameUnit ? sellPerUnit : sellPerUnit.mul(contents);
  return roundMoney(perBaseUnit, 0);
}

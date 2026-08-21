import { Decimal } from "decimal.js";
import { money, type Money } from "@/lib/domain/money/money";
import { assertPositiveQuantity } from "@/lib/domain/units/convert";

/**
 * Harga per satuan dasar (poin 7 Tahap 2, R10):
 * hargaPerSatuanDasar = harga / totalIsiDalamSatuanDasar
 *
 * `price` dapat berupa harga sebelum pajak ataupun setelah pajak,
 * tergantung tahap perhitungan mana yang ingin ditampilkan oleh pemanggil
 * — fungsi ini murni melakukan pembagian presisi tetap.
 */
export function calculatePricePerBaseUnit(
  price: Decimal.Value,
  totalContentInBaseUnit: Decimal.Value,
): Money {
  const validatedPrice = money(price, "Harga");
  const content = assertPositiveQuantity(totalContentInBaseUnit, "Total isi kemasan");

  return validatedPrice.div(content);
}

import { Decimal } from "decimal.js";
import { assertPositiveQuantity } from "@/lib/domain/units/convert";
import { money, type Money } from "@/lib/domain/money/money";
import type { ShippingResult } from "@/lib/domain/pricing/shipping";

/**
 * Perhitungan total biaya pesanan (poin 11 Tahap 2, R10):
 * - Subtotal setelah pajak (input, dari subtotal.ts).
 * - Ongkir (input, dari shipping.ts).
 * - Total biaya = subtotal + ongkir.
 * - Harga akhir per satuan dasar setelah ongkir = total biaya / jumlah aktual.
 *
 * Jika ongkir belum diketahui (mode PERLU_KONFIRMASI -> `shipping.fee ===
 * null`), maka `totalCost` dan `finalPricePerBaseUnit` JUGA `null` — tidak
 * boleh diam-diam dianggap nol (kasus uji #18).
 */
export interface OrderTotalInput {
  subtotalAfterTax: Decimal.Value;
  shipping: ShippingResult;
  /** Jumlah aktual barang (dalam satuan dasar) yang diterima dari pembelian ini. */
  actualQuantityInBaseUnit: Decimal.Value;
}

export interface OrderTotalResult {
  subtotalAfterTax: Money;
  shippingFee: Money | null;
  /** Total biaya (subtotal + ongkir). `null` jika ongkir belum diketahui. */
  totalCost: Money | null;
  /** Harga akhir per satuan dasar setelah ongkir. `null` jika totalCost belum diketahui. */
  finalPricePerBaseUnit: Money | null;
  requiresShippingConfirmation: boolean;
}

export function calculateOrderTotal(input: OrderTotalInput): OrderTotalResult {
  const subtotal = money(input.subtotalAfterTax, "Subtotal");
  const quantity = assertPositiveQuantity(input.actualQuantityInBaseUnit, "Jumlah aktual");

  const shippingFee = input.shipping.fee;
  const totalCost = shippingFee === null ? null : subtotal.plus(shippingFee);
  const finalPricePerBaseUnit = totalCost === null ? null : totalCost.div(quantity);

  return {
    subtotalAfterTax: subtotal,
    shippingFee,
    totalCost,
    finalPricePerBaseUnit,
    requiresShippingConfirmation: input.shipping.requiresConfirmation,
  };
}

import { Decimal } from "decimal.js";
import { money } from "@/lib/domain/money/money";
import type { PaymentStatus } from "@/lib/domain/orders/types";

/**
 * Status pembayaran pesanan (perbaikan #4). Fungsi murni: status hanya
 * diturunkan dari jumlah yang sudah dibayar vs total pesanan — tidak ada
 * status yang disimpan lalu dihitung manual di tempat lain.
 *
 * - `paidAmount` 0 -> BELUM_BAYAR.
 * - 0 < `paidAmount` < `orderTotal` -> DP.
 * - `paidAmount` >= `orderTotal` -> LUNAS (sama persis sudah lunas).
 */
export function computePaymentStatus(
  paidAmount: Decimal.Value,
  orderTotal: Decimal.Value,
): PaymentStatus {
  const paid = money(paidAmount, "Jumlah yang sudah dibayar");
  const total = money(orderTotal, "Total pesanan");
  if (paid.lte(0)) return "BELUM_BAYAR";
  if (paid.gte(total)) return "LUNAS";
  return "DP";
}

/** Sisa tagihan yang belum dibayar (tidak pernah negatif). */
export function computeRemainingAmount(
  orderTotal: Decimal.Value,
  paidAmount: Decimal.Value,
): Decimal {
  const total = money(orderTotal, "Total pesanan");
  const paid = money(paidAmount, "Jumlah yang sudah dibayar");
  const remaining = total.minus(paid);
  return remaining.gt(0) ? remaining : new Decimal(0);
}

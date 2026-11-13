import { Decimal } from "decimal.js";

/**
 * Logika murni penerimaan barang (R18, Tahap 5) — tanpa Prisma, tanpa
 * I/O, agar bisa diuji tanpa database (lihat docs/ARCHITECTURE.md §6).
 */

/**
 * Stok toko yang bertambah dari satu baris penerimaan: hanya barang
 * kondisi BAIK yang masuk stok, dalam satuan dasar produk.
 *
 * @param goodPackageQty jumlah kemasan kondisi baik yang diterima
 * @param totalPackageContent isi satu kemasan dalam satuan dasar
 *   (kolom `SupplierProduct.totalPackageContent`)
 */
export function computeStockAddition(
  goodPackageQty: Decimal.Value,
  totalPackageContent: Decimal.Value,
): Decimal {
  const good = new Decimal(goodPackageQty);
  const content = new Decimal(totalPackageContent);
  if (good.isNegative() || content.isNegative()) {
    throw new Error("Jumlah kemasan baik dan isi kemasan tidak boleh negatif.");
  }
  return good.mul(content);
}

export interface ReceiptCompletenessInput {
  orderedQty: Decimal.Value;
  receivedQty: Decimal.Value;
}

export interface ReceiptCompletenessResult {
  /** `true` bila ada baris yang diterima kurang dari yang dipesan. */
  isPartial: boolean;
  /** LENGKAP bila semua baris diterima >= yang dipesan, KURANG bila ada yang kurang. */
  overallCompleteness: "LENGKAP" | "KURANG";
}

/**
 * Kelengkapan penerimaan dari seluruh baris: satu baris kurang saja
 * sudah membuat penerimaan berstatus KURANG (parsial).
 */
export function computeReceiptCompleteness(
  items: readonly ReceiptCompletenessInput[],
): ReceiptCompletenessResult {
  const isPartial = items.some((item) =>
    new Decimal(item.receivedQty).lt(new Decimal(item.orderedQty)),
  );
  return { isPartial, overallCompleteness: isPartial ? "KURANG" : "LENGKAP" };
}

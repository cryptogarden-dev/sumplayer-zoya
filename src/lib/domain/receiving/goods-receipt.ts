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

/**
 * Stok toko yang harus DIKURANGI saat pesanan yang sudah DITERIMA dihapus
 * permanen: kebalikan dari `computeStockAddition` — jumlah yang dulu
 * masuk stok dari penerimaan itu (kemasan baik x isi kemasan).
 */
export function computeStockReversal(
  goodPackageQty: Decimal.Value,
  totalPackageContent: Decimal.Value,
): Decimal {
  return computeStockAddition(goodPackageQty, totalPackageContent);
}

/**
 * Stok toko setelah pembalikan penerimaan. Menolak bila stok saat ini
 * kurang dari yang mau dikurangi — stok tidak boleh jadi negatif (mis.
 * barang sudah terjual/dipakai setelah diterima).
 */
export function computeStockAfterReversal(
  currentStockQty: Decimal.Value,
  reversalQty: Decimal.Value,
  productLabel?: string,
): Decimal {
  const current = new Decimal(currentStockQty);
  const reversal = new Decimal(reversalQty);
  if (reversal.isNegative()) {
    throw new Error("Jumlah pembalikan stok tidak boleh negatif.");
  }
  const result = current.minus(reversal);
  if (result.isNegative()) {
    throw new Error(
      `Stok toko${productLabel ? ` ${productLabel}` : ""} saat ini (${current.toString()}) ` +
        `kurang dari yang mau dikurangi (${reversal.toString()}) — pesanan ini tidak bisa ` +
        `dihapus permanen sebelum stoknya ditambah lagi.`,
    );
  }
  return result;
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

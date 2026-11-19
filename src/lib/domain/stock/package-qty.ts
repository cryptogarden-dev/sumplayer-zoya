/**
 * Konversi jumlah stok antara satuan tampil (mis. Renceng) dan satuan
 * dasar (mis. pcs) — Stok Fleksibel 2026-11-19.
 *
 * Aturan: stok produk SELALU disimpan dalam satuan dasar (`stockQty`).
 * Satuan tampil adalah Renceng bila produk punya penawaran aktif
 * berkemas RENCENG (aturan yang sama dengan `displayUnitLabel`), kalau
 * tidak satuan tampil = satuan dasar. Isi satu satuan tampil =
 * `totalPackageContent` penawaran Renceng termurah (per satuan dasar).
 */

export interface PackageOfferInput {
  packageType: string;
  totalPackageContent: number;
  /** Harga per kemasan; boleh kosong (penawaran tanpa harga ikut dihitung). */
  pricePerPackage?: number;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Isi satu satuan tampil dalam satuan dasar. 1 bila produk tidak dijual
 * per renceng (tidak ada penawaran aktif RENCENG), mis. 10 untuk Kopi
 * Good Day (1 renceng = 10 sachet). Bila ada beberapa penawaran
 * Renceng, dipakai yang termurah per satuan dasar.
 */
export function displayPackageContent(offers: PackageOfferInput[]): number {
  const renceng = offers
    .filter((offer) => offer.packageType === "RENCENG" && offer.totalPackageContent > 0)
    .sort(
      (a, b) =>
        (a.pricePerPackage ?? Number.POSITIVE_INFINITY) / a.totalPackageContent -
        (b.pricePerPackage ?? Number.POSITIVE_INFINITY) / b.totalPackageContent,
    );
  return renceng.length > 0 ? renceng[0]!.totalPackageContent : 1;
}

/** Jumlah dalam satuan tampil dari jumlah satuan dasar (30 pcs -> 3 renceng). */
export function toDisplayQty(stockQtyBase: number, packageContent: number): number {
  if (packageContent <= 0) return stockQtyBase;
  return round4(stockQtyBase / packageContent);
}

/** Jumlah dalam satuan dasar dari jumlah satuan tampil (3 renceng -> 30 pcs). */
export function toBaseQty(displayQty: number, packageContent: number): number {
  return round4(displayQty * packageContent);
}

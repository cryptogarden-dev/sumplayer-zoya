/**
 * Error domain khusus untuk mesin perhitungan (Tahap 2).
 *
 * Modul ini TIDAK bergantung pada UI maupun database — hanya dipakai oleh
 * fungsi murni di `src/lib/domain/**`. Pemanggil (API route, komponen UI)
 * bertanggung jawab menangkap error ini dan menerjemahkannya menjadi pesan
 * yang ramah pengguna.
 */

/**
 * Dilempar saat dua satuan dari dimensi (family) berbeda dicoba
 * dibandingkan/dikonversi, mis. kilogram (WEIGHT) ke liter (VOLUME).
 * Menegakkan R05: "kg tidak boleh dibandingkan dengan liter, liter tidak
 * boleh dibandingkan dengan pcs".
 */
export class IncompatibleUnitError extends Error {
  constructor(
    public readonly fromFamily: string,
    public readonly toFamily: string,
  ) {
    super(
      `Satuan tidak kompatibel: tidak dapat mengonversi/membandingkan dimensi "${fromFamily}" dengan "${toFamily}".`,
    );
    this.name = "IncompatibleUnitError";
  }
}

/**
 * Dilempar saat kuantitas fisik (isi kemasan, kebutuhan, jumlah barang per
 * kemasan, dst.) bernilai nol, negatif, atau bukan angka valid.
 * Menegakkan poin 5 & R29 ("isi kemasan lebih dari nol").
 */
export class InvalidQuantityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidQuantityError";
  }
}

/**
 * Dilempar saat nilai uang (harga, tarif pajak, ongkir) negatif atau bukan
 * angka valid. Nilai nol tetap diperbolehkan untuk uang (mis. promo gratis),
 * berbeda dari kuantitas fisik yang wajib > 0.
 * Menegakkan R29 ("harga tidak negatif", "pajak tidak negatif", "ongkir
 * tidak negatif").
 */
export class InvalidMoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMoneyError";
  }
}

/**
 * Dilempar saat parameter konfigurasi (mis. mode ongkir yang butuh field
 * tertentu) tidak lengkap atau tidak valid untuk dihitung.
 */
export class InvalidConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidConfigurationError";
  }
}

/**
 * Dilempar saat percobaan menghapus PERMANEN data (produk/penawaran) yang
 * sudah pernah dipakai di riwayat pesanan (`purchase_order_items`).
 * Mencegah riwayat pesanan lama yang sudah dikirim/dikonfirmasi ke
 * supplier menjadi bolong/rusak. Pemanggil sebaiknya menonaktifkan data
 * tersebut, bukan menghapusnya (lihat docs/BACKLOG.md #5).
 */
export class DeletionBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeletionBlockedError";
  }
}

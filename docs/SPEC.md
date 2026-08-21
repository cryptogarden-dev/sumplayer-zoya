# SPEC.md — Spesifikasi Kebutuhan

## Sistem Supplier & Perbandingan Harga (nama sementara)

Status: Draft perencanaan awal. Belum ada implementasi kode.
Bahasa aplikasi: Bahasa Indonesia. Mata uang: Rupiah (IDR).

---

## 1. Ringkasan Produk

Aplikasi web responsif (PWA) untuk pemilik usaha dan staf guna:

- Mengelola data supplier dan produk yang mereka tawarkan.
- Membandingkan harga antar-supplier secara adil menggunakan harga per satuan
  dasar (kg, liter, pcs) — bukan harga per kemasan mentah.
- Menghitung total biaya riil (harga + pajak + ongkir) sebelum memesan.
- Membuat pesanan, mencatat penerimaan barang, dan menilai kinerja supplier
  berdasarkan data transaksi nyata (bukan rating subjektif atau data palsu).
- Mengekspor data pembelian yang sudah diterima ke aplikasi kasir terpisah.

Aplikasi ini **bukan** aplikasi kasir/POS dan tidak mengelola penjualan ke
pelanggan akhir.

---

## 2. Aktor & Peran

| Peran         | Deskripsi                              | Batasan                                                                                                                                                                   |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pemilik/Admin | Pemilik usaha atau admin yang ditunjuk | Akses penuh ke seluruh data bisnisnya: supplier, produk, harga, pesanan, pengaturan pajak, ekspor kasir, manajemen staf                                                   |
| Staf          | Karyawan operasional                   | Akses ke supplier, produk, perbandingan, pesanan, penerimaan barang sesuai izin yang diberikan; tidak dapat mengubah pengaturan pajak/bisnis atau menghapus data historis |

Setiap pengguna terikat ke satu atau lebih `business` (tenant). Data satu
bisnis tidak boleh terlihat oleh bisnis lain (multi-tenant, lihat R26).

---

## 3. Lingkup

### 3.1 Termasuk dalam lingkup

Semua kebutuhan pada bagian 4 (R01–R33).

### 3.2 Di luar lingkup (lihat R21, R23, R32)

- Penjualan ke pelanggan, pembayaran pelanggan, struk penjualan.
- Manajemen pelanggan dan program loyalitas.
- Laporan penjualan / laba-rugi kasir.
- Marketplace publik, chat publik antar pengguna umum, ulasan anonim.
- Sistem akuntansi lengkap (buku besar, neraca, dsb).
- Pembuatan pesanan otomatis tanpa persetujuan pengguna.

---

## 4. Kebutuhan Fungsional

Setiap kebutuhan diberi ID `Rxx` agar dapat dirunut di `TRACEABILITY.md`.

### R01 — Data Supplier

Sistem menyimpan per supplier: nama supplier, nama perusahaan, nama kontak,
no. HP, no. WhatsApp, email (opsional), alamat lengkap, kota, provinsi,
kecamatan, kode pos, titik lokasi/link Google Maps, area pengiriman, hari
pengiriman rutin, jam operasional, estimasi lead time, cut-off pemesanan,
minimum pembelian, metode & tempo pembayaran, catatan, status aktif.

Kriteria terima:

- Field wajib minimal: nama supplier, salah satu kontak (HP/WA), status aktif.
- Supplier nonaktif tidak muncul di rekomendasi/perbandingan default, tetapi
  riwayat transaksinya tetap dapat dilihat.

### R02 — Master Produk

Field: SKU, barcode (opsional), nama produk, merek, varian, kategori, foto
(opsional), jenis satuan pembanding (berat/cairan/jumlah), satuan dasar,
status aktif.

Kriteria terima:

- SKU unik per bisnis.
- `jenis satuan pembanding` menentukan `satuan dasar` yang valid (lihat R04).

### R03 — Penawaran Produk per Supplier (`supplier_products`)

Field: supplier, produk, nama/kode produk versi supplier, jenis kemasan,
jumlah barang dalam kemasan, isi setiap barang, total isi kemasan, satuan
dasar, harga per kemasan, status pajak, tarif pajak, minimum pembelian,
kelipatan pembelian, ketersediaan, jumlah stok (opsional), tanggal
pembaruan harga & stok, estimasi pengiriman.

Kriteria terima:

- Kombinasi (supplier, produk, jenis kemasan) dapat memiliki banyak baris
  penawaran jika kemasan berbeda.
- `total isi kemasan` = `jumlah barang dalam kemasan` × `isi setiap barang`,
  dihitung sistem, tidak diinput manual (mencegah kesalahan input).

### R04 — Satuan yang Didukung

Berat: gram, kilogram. Cairan: mililiter, liter. Jumlah: pcs, lusin.
Kemasan: dus, pak, karung, botol, kaleng, sak, bal, tray, box.

### R05 — Konversi Kemasan ke Satuan Dasar

- Berat dibandingkan sebagai harga/kg.
- Cairan dibandingkan sebagai harga/liter.
- Barang hitungan dibandingkan sebagai harga/pcs.
- Kg tidak boleh dibandingkan dengan liter; liter tidak boleh dibandingkan
  dengan pcs (family satuan berbeda = tidak dapat dibandingkan).
- Produk berbeda hanya dapat dibandingkan jika tergabung dalam kelompok
  produk setara (mis. "Beras 5kg" vs "Beras 25kg" adalah produk yang sama
  atau ditandai setara secara eksplisit, bukan otomatis oleh nama mirip).

### R06 — Contoh Konversi (kasus uji wajib)

1. 1 karung beras = 25 kg, harga Rp375.000 → Rp15.000/kg.
2. 1 dus minyak = 12 botol × 1 liter = 12 liter, harga Rp204.000 →
   Rp17.000/liter.
3. 1 dus barang = 24 pcs, harga Rp240.000 → Rp10.000/pcs.

Ketiga kasus ini menjadi golden test pada mesin perhitungan (Tahap 2).

### R07 — Status Pajak

Tiga status: sudah termasuk pajak, belum termasuk pajak, tanpa pajak.
Tarif pajak dapat diatur oleh Pemilik/Admin per bisnis (`tax_rates`), tidak
boleh di-hardcode di kode aplikasi. Setiap harga menyimpan snapshot nilai
tarif pajak yang berlaku saat itu (agar riwayat tidak berubah jika tarif
diubah di kemudian hari).

### R08 — Ongkir

Enam mode: gratis ongkir tanpa syarat, gratis ongkir dengan minimum
pembelian, ongkir tetap, ongkir berdasarkan area, pickup, ongkir perlu
dikonfirmasi. Disimpan sebagai `shipping_rules` per supplier.

### R09 — Status Ketersediaan

Tersedia, stok terbatas, kosong, pre-order, perlu konfirmasi. Produk berstatus
kosong tidak boleh menjadi rekomendasi utama (boleh tetap tampil, ditandai
jelas, dan tidak dapat dipesan — lihat R29).

### R10 — Perhitungan Sistem

Sistem menghitung: harga per kemasan, harga setelah pajak, harga per
kg/liter/pcs, jumlah kemasan yang harus dibeli, jumlah aktual diterima,
kelebihan akibat pembulatan kemasan, subtotal, ongkir, syarat gratis ongkir
terpenuhi/tidak, total pembayaran, harga akhir per satuan setelah ongkir.
Rincian rumus ada di `ARCHITECTURE.md` §6.

### R11 — Rumus Jumlah Kemasan

```
packagesRequired = ceil(kebutuhan / isiSatuKemasan)
```

Kemudian disesuaikan terhadap:

- Minimum pembelian (jika `packagesRequired` < minimum → naikkan ke minimum).
- Kelipatan pembelian (bulatkan ke atas ke kelipatan terdekat).
- Jumlah stok tersedia (jika stok diketahui dan kurang dari kebutuhan yang
  disesuaikan → beri peringatan, bukan pemesanan diam-diam yang gagal).
- Hasil akhir dipakai untuk menghitung jumlah aktual yang diterima dan
  kelebihan pembulatan (`jumlah aktual − kebutuhan asli`).

### R12 — Halaman Perbandingan (kolom wajib)

Supplier, ketersediaan, tanggal pembaruan stok & harga, harga per kemasan,
isi kemasan, harga per satuan, status pajak, jumlah kemasan, jumlah aktual,
subtotal, ongkir, total, harga akhir per satuan, estimasi tiba, riwayat
ketepatan pengiriman, tombol pilih, tombol WhatsApp.

### R13 — Label

Harga Satuan Termurah, Total Pembelian Termurah, Gratis Ongkir, Pengiriman
Tercepat, Paling Dekat, Stok Tersedia, Stok Terbatas, Perlu Konfirmasi,
Direkomendasikan. Label dihitung dari data nyata pada saat render, bukan
nilai statis.

### R14 — Transparansi Rekomendasi

Syarat supplier dapat direkomendasikan:

- Punya stok cukup atau dapat memenuhi pesanan.
- Melayani lokasi pengguna.
- Memenuhi jadwal kebutuhan (lead time ≤ waktu yang tersedia).
  Pertimbangan skor: total biaya, estimasi pengiriman, riwayat ketepatan.
  Sistem **tidak boleh** membuat rating/data palsu. Jika data tidak cukup,
  tampilkan teks "Data belum cukup". Alasan rekomendasi harus ditampilkan
  sebagai teks (mis. "Direkomendasikan karena harga per kg termurah dan stok
  tersedia").

### R15 — Estimasi Ketepatan Waktu

```
onTimeRate = (jumlahTepatWaktu + 1) / (jumlahPesananSelesai + 2)
```

Selalu tampilkan jumlah data pendukung, contoh: "Estimasi tepat waktu 86%,
berdasarkan 20 pengiriman." Jika `jumlahPesananSelesai = 0`, tetap tampilkan
hasil (50%) namun beri label eksplisit "berdasarkan 0 pengiriman — data
belum cukup" agar tidak menyesatkan.

### R16 — Pesanan (`purchase_orders`)

Field: nomor pesanan, supplier, produk, jumlah kemasan, harga, pajak,
ongkir, total, alamat pengiriman, jadwal, catatan, status
(draft/dipesan/dikirim/diterima/dibatalkan).

> **Revisi disepakati 2026-08-18 (lihat docs/BACKLOG.md #4):** status
> ditambah `dikonfirmasi` (antara dipesan dan dikirim) - menandai
> pesanan yang isinya sudah dipastikan (status ketersediaan per baris
> produk sudah ditandai manual berdasarkan balasan WhatsApp supplier)
> dan metode bayar (tunai/transfer) sudah dipilih, SEBELUM barang
> benar-benar dikirim/diterima secara fisik. Setiap baris produk
> (`purchase_order_items`) juga punya status ketersediaan sendiri
> (belum dikonfirmasi/tersedia/sebagian/tidak tersedia) - lihat
> docs/DATA_MODEL.md §18 untuk detail. Alur `dikirim`/`diterima` (R18)
> belum diimplementasikan pada revisi ini.

### R17 — Format Pesanan WhatsApp

Pengguna dapat menghasilkan teks pesanan siap-kirim ke WhatsApp supplier
(berisi daftar produk, jumlah kemasan, estimasi total, dan catatan),
dibuka via `wa.me` link dengan nomor WhatsApp supplier.

> **Revisi disepakati 2026-08-18 (lihat docs/BACKLOG.md #4):** untuk
> pesan pemesanan MULTI-PRODUK (satu supplier, banyak baris - lihat R16
> di atas), teks yang dikirim ke supplier SENGAJA TIDAK menyertakan
> estimasi total/harga apa pun - hanya daftar nama produk (+ merek/
> varian) dan jumlah. Alasan: harga belum pasti sampai dikonfirmasi
> balik oleh supplier, sehingga tidak boleh dikirim sebagai komitmen
> tertulis. Harga tetap tersimpan & terlihat di aplikasi (catatan
> internal), hanya tidak dicantumkan dalam teks WhatsApp. Fungsi format
> pesanan tunggal lama (`formatWhatsAppOrderMessage`, dengan estimasi
> total, dipakai halaman Bandingkan/R12) TIDAK diubah - lihat fungsi
> baru `formatWhatsAppPurchaseOrderMessage` di
> `src/lib/domain/whatsapp/format-order.ts` untuk kasus multi-produk ini.

### R18 — Penerimaan Barang (`goods_receipts`)

Field: jumlah dipesan, jumlah diterima, penerimaan parsial (boolean),
status lengkap/kurang, kondisi baik/rusak, jumlah barang rusak, harga
sesuai/berbeda, tepat waktu/terlambat, foto nota (opsional), catatan.

### R19 — Jadwal Rutin

Hari pengiriman supplier, template pesanan rutin, frekuensi
mingguan/bulanan, pengingat, tombol "Pesan Lagi". Sistem tidak membuat
pesanan otomatis — tombol "Pesan Lagi" hanya menyiapkan draft yang wajib
dikonfirmasi manual oleh pengguna.

### R20 — Riwayat Harga Tidak Dapat Dihapus

`supplier_prices` bersifat append-only (insert-only). Pembaruan harga
selalu menjadi baris baru; baris lama tidak pernah diubah/dihapus.

### R21 — Pemisahan dari Aplikasi Kasir

Aplikasi ini adalah sistem terpisah. Tidak berbagi basis kode/database
skema kasir; integrasi hanya lewat mekanisme ekspor eksplisit (R22).

### R22 — Ekspor ke Kasir

Setelah barang diterima, dapat diekspor: SKU, barcode, nama produk, jumlah
diterima, satuan, harga beli, supplier, nomor pesanan, tanggal diterima,
total pembelian. Format awal: CSV dan JSON. Struktur data disiapkan agar
kompatibel dengan REST API/webhook di masa depan (lihat `ARCHITECTURE.md`
§7).

### R23 — Fitur Kasir yang Dilarang

Tidak ada: penjualan pelanggan, pembayaran pelanggan, struk penjualan,
manajemen pelanggan, laporan penjualan.

### R24 — Responsif & PWA

Mobile-first, navigasi bawah di HP, sidebar di desktop, kartu perbandingan
di HP, tabel perbandingan di desktop, Bahasa Indonesia, mata uang Rupiah,
tombol besar & mudah disentuh (≥44×44px), tanpa horizontal scroll
mengganggu di HP, dapat diinstal sebagai PWA (manifest + service worker).

### R25 — Navigasi Utama (dibatasi 4 menu)

Supplier, Produk, Bandingkan, Pesanan. Fungsi lain (penerimaan barang,
jadwal rutin, pengaturan, ekspor kasir) diakses sebagai sub-halaman dari
keempat menu ini agar navigasi utama tetap ringkas.

### R26 — Hak Akses

Peran: Pemilik/Admin, Staf. Setiap pengguna hanya dapat mengakses data
bisnis miliknya sendiri (isolasi multi-tenant di setiap query, lihat
`ARCHITECTURE.md` §4).

### R27 — Presisi Uang

Semua nilai uang disimpan sebagai tipe desimal presisi tetap (`numeric` di
PostgreSQL / `Decimal` di kode aplikasi). Tidak menggunakan `float`/`double`
untuk perhitungan uang di manapun dalam basis kode.

### R28 — Audit Dasar

Setiap entitas relevan menyimpan: `created_at`, `updated_at`, `created_by`,
`business_id`, serta `is_active` bila relevan.

### R29 — Validasi Wajib

- Harga ≥ 0.
- Isi kemasan > 0.
- Tarif pajak ≥ 0.
- Ongkir ≥ 0.
- Jumlah pesanan mengikuti minimum & kelipatan pembelian.
- Satuan berbeda family tidak dapat dibandingkan/dijumlahkan.
- Produk dengan ketersediaan "kosong" tidak dapat dipesan.
- Pembatalan pesanan wajib menyertakan alasan (`cancel_reason`).
- Harga lama tetap tersimpan (lihat R20).

### R30 — Stack Teknologi (karena folder proyek kosong)

Next.js, TypeScript strict, Tailwind CSS, komponen UI aksesibel,
PostgreSQL, ORM stabil, autentikasi aman, PWA manifest + service worker,
unit test & integration test, versi stabil + lockfile. Rincian pemilihan
ada di `ARCHITECTURE.md`.

### R31 — Tidak Ada Secret Hardcoded

Semua kredensial (DB, session secret, dsb.) melalui environment variable,
tidak pernah dikomit ke repo. Sediakan `.env.example` tanpa nilai asli.

### R32 — Fitur yang Dilarang

Tidak ada marketplace publik, chat publik, ulasan anonim, sistem kasir,
sistem akuntansi lengkap.

### R33 — Tidak Ada Placeholder Palsu

Semua tombol utama pada UI final harus benar-benar berfungsi sesuai
tahap implementasi yang sudah selesai; fitur yang belum dibangun tidak
ditampilkan sebagai tombol aktif yang menipu pengguna.

---

## 5. Kebutuhan Non-Fungsional

| Kategori             | Kebutuhan                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Performa             | Halaman perbandingan tetap responsif untuk ≥50 supplier × ≥200 produk per bisnis                                                         |
| Keamanan             | Password di-hash (argon2/bcrypt), sesi aman, proteksi CSRF pada form, rate limiting login                                                |
| Aksesibilitas        | Kontras warna memenuhi WCAG AA, seluruh interaksi dapat dioperasikan via keyboard, komponen memakai peran ARIA yang benar                |
| Lokalisasi           | Seluruh teks UI Bahasa Indonesia; format tanggal & angka mengikuti konvensi Indonesia                                                    |
| Ketersediaan offline | Halaman yang sudah pernah dibuka dapat ditampilkan dalam mode offline terbatas (read-only cache); aksi tulis (submit) memerlukan koneksi |
| Portabilitas data    | Ekspor kasir tidak boleh mengunci pengguna pada satu format (CSV & JSON sejak awal)                                                      |
| Auditability         | Perubahan data penting (harga, status pesanan) dapat ditelusuri: siapa, kapan, apa                                                       |

---

## 6. Glosarium

| Istilah             | Arti                                                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| Kemasan             | Satuan jual dari supplier, mis. dus, karung, botol                                |
| Satuan dasar        | Satuan pembanding universal: kg (berat), liter (cairan), pcs (jumlah)             |
| Isi kemasan         | Total isi kemasan dinyatakan dalam satuan dasar                                   |
| Harga per satuan    | Harga per kemasan dibagi isi kemasan (dalam satuan dasar)                         |
| Kelipatan pembelian | Jumlah kemasan harus berupa kelipatan bulat dari nilai ini                        |
| Lead time           | Estimasi waktu dari pesan hingga barang tiba                                      |
| Cut-off             | Batas waktu harian/mingguan supplier menerima pesanan untuk jadwal kirim terdekat |

---

## 7. Asumsi & Pertanyaan Terbuka

Asumsi yang diambil karena tidak dijelaskan eksplisit oleh pengguna;
harus dikonfirmasi sebelum Tahap 3 dimulai:

1. **Kelompok produk setara**: perbandingan lintas-produk (mis. beras merek
   A vs B) memerlukan penandaan manual "kelompok produk setara" oleh
   pengguna, bukan pencocokan otomatis berdasarkan nama — untuk mencegah
   perbandingan yang menyesatkan (selaras R05 poin terakhir).
2. **"Data belum cukup"**: didefinisikan sebagai kondisi ketika salah satu
   dari: (a) `jumlahPesananSelesai = 0` untuk ketepatan waktu, (b) lokasi
   pengguna belum diatur untuk mengecek jangkauan area, atau (c) data harga
   berumur di atas ambang tertentu (dikonfigurasi, default 30 hari) yang
   membuat kelayakan tidak pasti.
3. **Lokasi pengguna**: bisnis memiliki satu alamat pengiriman utama yang
   dipakai untuk mengecek "Paling Dekat" dan jangkauan area supplier;
   multi-cabang dapat ditambahkan kemudian (bukan lingkup awal).
4. **Foto nota/produk**: disimpan di object storage (mis. kompatibel S3),
   bukan sebagai BLOB database, untuk menjaga performa.
5. **Ekspor kasir**: dipicu manual oleh pengguna (tombol "Ekspor ke Kasir")
   per penerimaan barang atau per rentang tanggal, bukan otomatis, agar
   pengguna dapat memeriksa data sebelum kasir menerimanya.

Pertanyaan yang perlu dijawab pemilik produk sebelum Tahap 3:

- Apakah satu bisnis dapat memiliki lebih dari satu alamat/gudang?
- Apakah staf perlu izin granular per-modul, atau cukup satu peran "Staf"?
- Format nomor pesanan yang diinginkan (mis. `PO-2026-0001`)?

# BACKLOG.md — Catatan Permintaan & Isu Lanjutan

Dokumen ini menampung permintaan fitur dan isu yang **belum masuk** ke
`IMPLEMENTATION_PLAN.md` tahap manapun secara resmi — biar tidak hilang
sebelum direncanakan dengan detail. Pindahkan ke `IMPLEMENTATION_PLAN.md`
(sebagai tahap baru atau tambahan tahap yang ada) begitu siap dikerjakan.

---

## 1. Lokasi tujuan default per cabang (halaman Bandingkan)

**Status: VERSI AWAL SELESAI (2026-08-18).**

**Asal:** masukan pengguna, 2026-08-18, saat mencoba halaman `/bandingkan`.

**Masalah saat ini:** provinsi/kota/kecamatan tujuan di form Bandingkan
(`src/components/perbandingan/ComparisonForm.tsx`) harus diisi manual
setiap kali membandingkan harga.

**Permintaan:** buat lebih fleksibel — lokasi tujuan otomatis terisi
sesuai lokasi bisnis pengguna, atau lokasi "Cabang 1" jika bisnis punya
lebih dari satu cabang/lokasi. Pengguna tetap bisa mengubahnya secara
manual jika perlu (misal membandingkan untuk cabang lain).

**Implikasi desain (perlu didiskusikan sebelum dikerjakan):**

- Skema saat ini (`prisma/schema.prisma`, model `Business`) belum
  punya konsep multi-cabang/multi-lokasi — hanya satu alamat per bisnis
  (jika ada) atau tidak ada sama sekali. Perlu dicek apakah field lokasi
  bisnis sudah ada; jika belum, perlu tabel/kolom baru (mis. `business
locations` atau field alamat di `businesses`).
- Kalau multi-cabang: perlu keputusan produk — apakah 1 akun bisa punya
  banyak cabang, dan bagaimana pengguna memilih/berpindah cabang aktif.
- Setelah data lokasi ada, `ComparisonForm`/`ComparisonView` tinggal
  diisi nilai awal (`province`/`city`/`district`) dari lokasi
  bisnis/cabang aktif, bukan string kosong.

**Sudah dikerjakan (disepakati lewat diskusi 2026-08-18 - user: "untuk
sekarang 1 cabang, bisa nambah nantinya"):**

- Tabel baru `business_locations` (model `BusinessLocation` di
  `prisma/schema.prisma`) - sengaja terpisah dari `Business` supaya bisa
  menambah cabang lain nanti TANPA migrasi ulang. Baru dipakai 1 baris
  per bisnis (ditandai `isDefault`).
- Repository: `src/lib/server/repositories/business-location-repository.ts`.
- API: `GET/POST /api/business-locations`, `PATCH
/api/business-locations/[id]/status`.
- Halaman pengaturan: `src/app/(dashboard)/pengaturan/lokasi/page.tsx`
  (khusus Pemilik/Admin, link lewat menu profil) +
  `src/components/lokasi/LocationForm.tsx`.
- `src/components/perbandingan/ComparisonView.tsx` otomatis mengisi
  provinsi/kota/kecamatan dari lokasi default saat halaman dibuka
  (tetap bisa diedit manual).

**BELUM dikerjakan (di luar cakupan sesi ini):**

- UI untuk berpindah cabang aktif (baru relevan begitu ada >1 cabang).
- Belum ada data seed untuk `business_locations` - pengguna perlu
  membuat lokasi pertama sendiri lewat halaman pengaturan sebelum
  pengisian otomatis berfungsi.

---

## 2. Supplier online (marketplace) selain offline

**Status: BELUM DIKERJAKAN** (permintaan terpisah dari #4 di bawah -
diskusi 2026-08-18 berlanjut ke fitur Pesanan multi-produk, bukan ke
supplier online).

**Asal:** masukan pengguna, 2026-08-18.

**Permintaan:** halaman Bandingkan/Supplier jangan hanya mencakup
supplier offline (toko/distributor fisik) — tambahkan juga sumber
online seperti Shopee, Tokopedia, dan marketplace lain sebagai pilihan
supplier yang bisa dibandingkan harganya.

**Implikasi desain (perlu didiskusikan sebelum dikerjakan):**

- Opsi A (paling sederhana, tanpa ubah skema): perlakukan toko online
  sebagai "supplier" biasa di tabel `suppliers` (nama = "Tokopedia -
  Toko X", alamat/kota diisi manual atau dikosongkan), lalu penawaran
  produknya dimasukkan manual seperti supplier offline lain lewat
  `OfferForm` yang sudah ada. Ini bisa jalan HARI INI tanpa kode baru,
  tapi harganya harus diupdate manual (tidak otomatis sinkron dari
  marketplace).
- Opsi B (lebih canggih, butuh pekerjaan baru): tambah field
  `channelType` (`OFFLINE` / `ONLINE`) atau `marketplaceUrl` di
  `suppliers`, agar UI bisa membedakan & menampilkan link ke toko
  online. Masih manual entry harga, hanya beda tampilan/filter.
- Opsi C (paling kompleks, di luar cakupan proyek saat ini): integrasi
  API resmi Shopee/Tokopedia untuk tarik harga otomatis — butuh akun
  seller/API key, rate limit, dan effort besar. Sebaiknya TIDAK
  dikerjakan dulu kecuali eksplisit diminta.

**Rekomendasi:** mulai dari Opsi A (tidak butuh kode), lalu Opsi B kalau
jumlah supplier online sudah banyak dan butuh dibedakan visual dari
supplier offline.

---

## 3. Bug: "Data tidak valid" saat submit form Bandingkan

**Status: SUDAH DIPERBAIKI (2026-08-18).**

**Asal:** ditemukan pengguna, 2026-08-18, saat mencoba produk Minyak
Goreng, 10 ml, tujuan Jawa Barat/Sumedang/Cimalaka.

**Gejala:** submit form di `/bandingkan` menampilkan pesan generik
"Data tidak valid." (lihat `src/lib/server/api-auth.ts` ->
`handleApiError`, pesan ini muncul kalau `comparisonQuerySchema.parse`
di `src/app/api/comparison/route.ts` melempar `ZodError`).

**Akar masalah (dikonfirmasi):** ID contoh (seed) di `prisma/seed.ts`
ditulis manual sebagai string mirip UUID, misalnya
`00000000-0000-0000-0000-0000000000b2` untuk produk Minyak Goreng.
String ini SECARA BENTUK terlihat seperti UUID, tapi bukan UUID yang sah
secara ketat: digit pertama grup ke-3 ("versi" UUID) bernilai `0`,
sedangkan RFC 4122 mewajibkan nilai `1`-`8`. Zod v4 (`z.string().uuid()`,
dipakai di antara lain pada `productId` di
`src/lib/validation/comparison.ts`, `supplierId`/`taxRateId` di
`src/lib/validation/supplier-product.ts`) memvalidasi bentuk UUID secara
ketat sesuai RFC, sehingga menolak ID seed tersebut dengan error generik
"Invalid UUID" -> dibungkus jadi "Data tidak valid." oleh
`handleApiError`. Ini BUKAN cuma bug di halaman Bandingkan — field yang
sama juga dipakai saat menambah penawaran (`OfferForm`, Langkah 6 Tahap 3) memilih supplier/tarif pajak contoh, jadi berpotensi gagal juga di
sana.

**Perbaikan yang dilakukan:**

1. `prisma/seed.ts` — 15 ID contoh (business, tax rate, 2 produk, 3
   supplier, 4 penawaran, 4 riwayat harga) diubah dari bentuk
   `...-0000-0000-...` menjadi bentuk UUID v4 yang sah
   `...-4000-8000-...` (digit versi `4`, digit varian `8`), tanpa
   mengubah suffix pengenal (`b1`, `c2`, dst.) agar tetap mudah dibaca.
2. Database dev lokal yang SUDAH terisi data seed lama diperbaiki
   langsung lewat `UPDATE ... SET id = ...` bertarget (dijalankan sekali
   lewat `prisma db execute`, relasi FK ikut terupdate otomatis karena
   semua constraint sudah `ON UPDATE CASCADE`) — jadi data yang sudah
   ditambahkan pengguna sendiri tidak hilang/tertimpa.
3. Diverifikasi: `z.string().uuid()` menerima ID baru, `npm run
lint`/`typecheck`/`test` (232/232) lulus.

**Belum divalidasi manual di browser oleh pengguna** — mohon coba lagi
halaman `/bandingkan` dengan produk Beras Premium/Minyak Goreng untuk
konfirmasi akhir.

---

## 4. Pesanan multi-produk per supplier, tanpa harga di WhatsApp, status ketersediaan per baris, & metode bayar

**Status: VERSI AWAL SELESAI (2026-08-18).**

**Asal:** diskusi dengan pengguna, 2026-08-18. Ini setara Tahap 5
(`docs/IMPLEMENTATION_PLAN.md`) yang dikerjakan lebih awal atas
permintaan langsung, dengan beberapa penyesuaian terhadap rencana awal
di `docs/SPEC.md` (R16/R17) — lihat catatan revisi di
`docs/DATA_MODEL.md` §17-18 dan komentar di `prisma/schema.prisma`.

**Kebutuhan yang disepakati:**

1. Satu draft pesanan = satu supplier, bisa berisi banyak baris produk
   ("keranjang").
2. Pesan WhatsApp yang dikirim ke supplier HANYA berisi daftar produk
   (nama + merek + varian/ukuran) dan jumlah — TIDAK ada harga, karena
   harga belum pasti sampai dikonfirmasi balik oleh supplier.
3. Setiap baris produk punya status ketersediaan yang ditandai MANUAL
   oleh pengguna setelah membaca balasan WhatsApp supplier: Belum
   Dikonfirmasi / Tersedia / Sebagian (dengan jumlah terkonfirmasi) /
   Tidak Tersedia.
4. Konfirmasi final memilih metode bayar: Tunai atau Transfer.
5. Mulai pesanan bisa dari halaman Supplier langsung ATAU dari
   Bandingkan (disepakati keduanya boleh) — baru halaman Supplier yang
   dibangun pada sesi ini (lihat "Belum dikerjakan").

**Yang sudah dibangun:**

- Skema: model `BusinessLocation`, `PurchaseOrder`, `PurchaseOrderItem` +
  enum `PurchaseOrderStatus` (tambah `DIKONFIRMASI`), enum baru
  `PurchaseOrderItemAvailability`, `PaymentMethod` (`prisma/schema.prisma`,
  migrasi `20260818224243_pesanan_dan_lokasi_cabang` +
  `20260818224500_purchase_order_item_unique_supplier_product`).
- Domain: `src/lib/domain/orders/types.ts` (satu sumber kebenaran enum,
  sinkron dengan Prisma), label Indonesia di `src/lib/format/orders.ts`.
- Validasi: `src/lib/validation/purchase-order.ts`,
  `src/lib/validation/business-location.ts`.
- Repository: `src/lib/server/repositories/purchase-order-repository.ts`
  (draft, tambah/ubah/hapus baris — perilaku "keranjang" otomatis
  menambah jumlah jika produk yang sama ditambah lagi —, kirim ke
  supplier + nomor pesanan otomatis `PO-YYYY-NNNN`, tandai ketersediaan
  per baris, konfirmasi dengan metode bayar, batalkan dengan alasan
  wajib R29).
- API: `/api/purchase-orders` (+ sub-route `[id]`, `[id]/items`,
  `[id]/items/[itemId]`, `[id]/items/[itemId]/availability`,
  `[id]/send`, `[id]/confirm`, `[id]/cancel`).
- WhatsApp: `formatWhatsAppPurchaseOrderMessage()` baru di
  `src/lib/domain/whatsapp/format-order.ts` (multi-produk, tanpa harga).
- UI: `src/app/(dashboard)/pesanan/page.tsx` (daftar),
  `.../pesanan/[id]/page.tsx` + `src/components/pesanan/PesananWorkspace.tsx`
  (susun draft, kirim WA, tandai ketersediaan, konfirmasi, batalkan).
  Tombol "Buat Pesanan" di halaman detail Supplier
  (`src/components/supplier/CreateOrderButton.tsx`).
- Validasi dijalankan: `npm run format`/`lint`/`typecheck` lulus, `npm
run test` 232/232 lulus (test LAMA — belum ada test BARU untuk fitur
  ini, lihat "Belum dikerjakan"), `npm run build` lulus untuk semua
  route baru.

**BELUM dikerjakan / diketahui sebagai keterbatasan (jujur dicatat, di
luar cakupan sesi ini):**

- **Tidak ada integration test otomatis** untuk
  `purchase-order-repository.ts`/`business-location-repository.ts` —
  baru divalidasi lewat typecheck/lint/build, BELUM dites manual di
  browser oleh pengguna.
- **Minimum & kelipatan pembelian** (`minPurchasePackages`,
  `purchaseMultiplePackages` di `SupplierProduct`) BELUM ditegakkan saat
  menambah baris produk ke pesanan (seharusnya jumlah otomatis
  dibulatkan/divalidasi sesuai aturan supplier, seperti sudah ada di
  mesin Tahap 2 untuk halaman Bandingkan, tapi belum dipanggil di
  `addPurchaseOrderItem`).
- Tombol "Tambah ke Pesanan" langsung dari halaman Bandingkan BELUM
  dibuat — saat ini pesanan hanya bisa dimulai dari halaman Supplier.
- R18 (`goods_receipts` — penerimaan barang fisik, status
  DIKIRIM/DITERIMA) dan R15 (rekomputasi `supplier_performance`) BELUM
  dikerjakan — alur saat ini berhenti di status DIKONFIRMASI.
- R19 (jadwal rutin, template pesanan, tombol "Pesan Lagi", pengingat)
  BELUM dikerjakan.
- Foto/gambar produk pada daftar "Tambah Produk" belum ditampilkan
  (field `photoUrl` sudah ada di skema tapi tidak dipakai di UI ini).

---

## 5. Hapus data (Pesanan, Penawaran, Produk) & sederhanakan form Tambah Penawaran

**Status: SELESAI (2026-08-21).** Semua pertanyaan di bawah sudah dijawab
pengguna dan diimplementasikan. `npm run format`/`lint`/`typecheck`/`test`
(232/232)/`build` semua lulus.

**Asal:** masukan pengguna, 2026-08-21, dari halaman `/pesanan` (menumpuk,
tidak bisa dihapus, tidak ada tanggal) dan form "Tambah Penawaran" di
halaman detail produk (`OfferForm`) yang dianggap membingungkan, ditambah
laporan produk yang "dihapus" masih muncul di sisi supplier.

**Temuan investigasi kode (dikonfirmasi, bukan dugaan):**

1. **Tidak ada hapus permanen di mana pun saat ini.** Tombol yang ada
   (`ProductStatusButton`, `SupplierStatusButton`, status penawaran di
   `supplier-products/[id]/status`) semuanya cuma toggle `isActive`
   (nonaktifkan), bukan hapus sungguhan dari database. Pesanan (`/pesanan`)
   malah tidak punya aksi hapus ATAU nonaktifkan sama sekali — draft
   kosong seperti "Draft - Toko Sembako Makmur" (Rp 0) akan menumpuk
   selamanya.
2. **Bug dikonfirmasi:** `listOffersForComparison()` di
   `src/lib/server/repositories/supplier-product-repository.ts` (dipakai
   oleh halaman Bandingkan lewat `buildComparison()`) memfilter
   `supplierProduct.isActive` dan `supplier.isActive`, TAPI TIDAK
   memfilter `product.isActive`. Akibatnya: produk yang sudah
   dinonaktifkan di halaman Produk tetap muncul di hasil Bandingkan
   (dan berpotensi masih bisa dipesan) selama penawarannya sendiri masih
   aktif. Ini kemungkinan besar akar masalah "produk kehapus tapi di
   supplier masih ada" yang dilaporkan pengguna. **Perlu diperbaiki
   terlepas dari keputusan hapus-permanen di bawah** — nonaktifkan produk
   harus benar-benar menyembunyikannya di semua alur.
3. **Constraint database untuk hapus permanen Produk/Penawaran:**
   `Product -> SupplierProduct` dan `SupplierProduct -> PurchaseOrderItem`
   sama-sama `onDelete: Cascade` (lihat `prisma/schema.prisma`). Artinya
   kalau Produk dihapus permanen dari database, SEMUA penawaran
   suppliernya ikut terhapus otomatis, TERMASUK baris produk itu di
   riwayat pesanan lama (`purchase_order_items`) yang sudah pernah
   dikirim/dikonfirmasi ke supplier — riwayat transaksi itu bisa jadi
   bolong/rusak. Ini perlu keputusan sadar, bukan langsung diaktifkan.

**Pertanyaan yang perlu dijawab pengguna sebelum coding dimulai:**

1. **Hapus Pesanan** — pesanan yang masih `DRAFT` atau sudah
   `DIBATALKAN` aman dihapus permanen kapan saja (belum berefek nyata ke
   supplier/riwayat). Untuk status `DIPESAN`/`DIKONFIRMASI`/`DIKIRIM`/
   `DITERIMA` (sudah dikirim WA ke supplier / sudah dikonfirmasi) —
   apakah boleh dihapus permanen langsung, atau harus dibatalkan dulu
   (jadi `DIBATALKAN`) baru boleh dihapus? _(Rekomendasi: harus dibatalkan
   dulu, supaya ada jejak kenapa pesanan itu tidak jadi — tapi keputusan
   akhir di pengguna.)_
2. **Hapus Produk permanen** — karena hapus permanen produk yang PERNAH
   dipesan akan merusak riwayat pesanan lama (poin 3 di atas), usulan:
   produk yang belum pernah muncul di pesanan manapun boleh dihapus
   permanen bebas; produk yang sudah pernah dipesan hanya bisa
   dinonaktifkan (tapi nonaktifkan-nya akan diperbaiki supaya benar-benar
   hilang dari semua tampilan, sesuai temuan #2). Setuju dengan
   pendekatan ini?
3. **Hapus Penawaran (supplier-product) permanen** — pertanyaan sama
   seperti poin 2: penawaran yang belum pernah dipesan boleh dihapus
   bebas; yang sudah pernah dipesan hanya bisa dinonaktifkan?
4. **Simplifikasi form Tambah Penawaran (`OfferForm`)** — usulan:
   - Mode default "Kemasan sederhana": field "Jumlah Barang / Kemasan"
     disembunyikan (otomatis diisi 1), yang tampil cuma "Isi per Kemasan"
     - "Satuan" (mis. "1" + "kg" untuk beli aci 1 kg). Ada tombol/toggle
       "Kemasan berlapis (mis. 1 dus isi 12 botol)" untuk kasus yang
       memang butuh dua tingkat (baru field "Jumlah Barang/Kemasan"
       muncul lagi).
   - Tambahkan preview otomatis di bawah form: "≈ Rp 3.500 / 250 gram"
     dihitung langsung dari harga per kemasan yang diketik, memakai
     fungsi `resolvePackage()` yang sama dengan mesin Tahap 2 (supaya
     pengguna langsung lihat apakah perhitungannya sesuai ekspektasi
     tanpa harus submit dulu).
   - Tidak mengubah skema/API, murni penyederhanaan UI + kalkulasi
     langsung di client.
     Setuju dengan pendekatan ini?
5. **Tanggal di kartu Pesanan** — tidak perlu didiskusikan, akan
   ditambahkan langsung (format simple, mis. "21 Agu 2026") begitu
   pengerjaan dimulai.

**Jawaban pengguna (2026-08-21):**

1. Pesanan `DIPESAN`/`DIKONFIRMASI`/dst harus dibatalkan dulu (jadi
   `DIBATALKAN`) sebelum bisa dihapus permanen. Draft/Dibatalkan boleh
   dihapus kapan saja.
2. Setuju: produk yang sudah pernah dipesan HANYA bisa dinonaktifkan
   (tidak hilang dari riwayat pesanan lama), produk yang belum pernah
   dipesan boleh dihapus permanen bebas. Produk nonaktif harus tetap
   tampak di daftar (dengan tanda jelas) supaya bisa diaktifkan lagi
   sewaktu-waktu.
3. Setuju: penawaran (supplier-product) ikuti aturan yang sama seperti
   produk (poin 2).
4. Setuju dengan simplifikasi form (mode sederhana + preview harga
   otomatis).

**Yang sudah dikerjakan:**

- **Bug diperbaiki:** `listOffersForComparison()`
  (`src/lib/server/repositories/supplier-product-repository.ts`) sekarang
  ikut memfilter `product: { isActive: true }` — produk nonaktif tidak
  lagi muncul di halaman Bandingkan.
- **Error domain baru:** `DeletionBlockedError`
  (`src/lib/domain/errors/domain-errors.ts`) - dilempar saat percobaan
  hapus permanen produk/penawaran yang sudah pernah dipakai di
  `purchase_order_items` (ditangkap generik oleh `handleApiError` -> 400
  dengan pesan jelas, konsisten dengan pola `OrderStateError` yang sudah
  ada).
- **Hapus Produk permanen:** `deleteProduct()`
  (`src/lib/server/repositories/product-repository.ts`) menolak hapus
  kalau ada riwayat pesanan terkait (lewat relasi `SupplierProduct`),
  kalau tidak ada baru `prisma.product.delete()` (cascade aman ke
  `SupplierProduct`/`SupplierPrice`/`SupplierStock` karena tidak ada
  riwayat untuk dirusak). Endpoint `DELETE /api/products/[id]` (role
  `ONLY_OWNER_ADMIN`, sama seperti endpoint nonaktifkan). Tombol
  "Hapus Produk Permanen" baru: `src/components/produk/ProductDeleteButton.tsx`,
  dipasang di `src/app/(dashboard)/produk/[id]/page.tsx` di samping tombol
  nonaktifkan yang sudah ada.
- **Produk nonaktif tetap terlihat:** `src/app/(dashboard)/produk/page.tsx`
  sekarang memanggil `listProducts(businessId, { includeInactive: true })`
  - badge "Nonaktif" sudah ada sebelumnya di `ProductCard.tsx`, sekarang
    produk nonaktif tidak lagi hilang begitu saja dari daftar. Panel "Pesan"
    cepat (`ProductQuickOrderSheet.tsx`) sekarang menampilkan pesan
    "produk nonaktif, tidak bisa dipesan" alih-alih daftar supplier kalau
    produk yang dipilih sedang nonaktif.
- **Hapus Penawaran permanen:** `deleteOffer()`
  (`src/lib/server/repositories/supplier-product-repository.ts`), aturan
  sama seperti produk (cek `purchase_order_items` by `supplierProductId`).
  Endpoint `DELETE /api/supplier-products/[id]` (role `ONLY_OWNER_ADMIN`).
  Komponen baru `src/components/produk/OfferActions.tsx` (tombol
  Nonaktifkan/Aktifkan + Hapus Permanen per baris penawaran) dipasang di
  daftar "Penawaran dari Supplier" pada `produk/[id]/page.tsx` - sebelumnya
  daftar itu cuma menampilkan teks status tanpa tombol aksi sama sekali.
- **Hapus Pesanan permanen:** `deletePurchaseOrder()`
  (`src/lib/server/repositories/purchase-order-repository.ts`) - hanya
  untuk status `DRAFT`/`DIBATALKAN`, selain itu melempar `OrderStateError`
  ("batalkan dulu"). Endpoint `DELETE /api/purchase-orders/[id]` (role
  `OWNER_ADMIN_AND_STAFF`, konsisten dengan aksi pesanan lain). Tombol
  hapus ditambahkan di dua tempat: daftar `/pesanan` (komponen client baru
  `src/components/pesanan/PesananList.tsx`, menggantikan render statis di
  `pesanan/page.tsx`) dan halaman detail
  (`src/components/pesanan/PesananWorkspace.tsx`, tombol "Hapus Pesanan
  Permanen" di samping "Batalkan Pesanan").
- **Tanggal di kartu Pesanan:** `PesananList.tsx` menampilkan
  `formatTanggalIndonesia(order.createdAt)` (helper yang sudah ada di
  `src/lib/format/date.ts`) di bawah jumlah produk.
- **`OfferForm` disederhanakan** (`src/components/produk/OfferForm.tsx`):
  - Field "Jumlah Barang/Kemasan" disembunyikan secara default (dianggap
    1. - baru muncul kalau pengguna mencentang "Kemasan ini berisi
         beberapa barang kecil (misal 1 dus isi 12 botol)".
  - Preview harga otomatis real-time ("1 karung = 1 kg", "Harga ≈
    Rp14.000/kg") dihitung di klien memakai fungsi murni yang SAMA dengan
    mesin Tahap 2 (`resolvePackage` + `calculatePricePerBaseUnit` dari
    `@/lib/domain`) - tidak ada logika hitung baru/terpisah, jadi hasilnya
    dijamin konsisten dengan yang dihitung ulang di server.
  - Field yang jarang dipakai (SKU/Nama Supplier, Minimum & Kelipatan
    Pembelian, Status/Tarif Pajak) dipindah ke bagian "Pengaturan Lanjutan
    (opsional)" yang bisa dilipat (elemen `<details>`, pola yang sudah
    dipakai di `ComparisonCards.tsx`) - defaultnya sudah masuk akal (min=1,
    kelipatan=1, tanpa pajak) jadi kebanyakan pengguna tidak perlu
    membukanya.

**Perbaikan tambahan (2026-08-21, sesi lanjutan hari yang sama):**

Saat dicoba langsung, pengguna menemukan kasus produk "hitungan" (mis.
renceng kopi sachet) yang isinya beda-beda per supplier (ada yang isi 10,
ada yang isi 12). Field "Isi per Kemasan + Satuan" ternyata TIDAK cocok
untuk kasus ini: memilih satuan "Lusin" (baku = 12 pcs, tidak bisa diubah)
menimbulkan hasil kali ganda yang membingungkan kalau digabung dengan
"Jumlah Barang Kecil per Kemasan" dari mode kemasan berlapis.

**Perbaikan:** `OfferForm.tsx` sekarang mendeteksi `unitFamily ===
"COUNT"` (produk hitungan) dan menyembunyikan seluruh "Isi per
Kemasan"/"Satuan"/toggle kemasan berlapis untuk kasus itu - diganti SATU
field langsung: "Berapa Pcs dalam 1 [Jenis Kemasan]?" (mis. "Berapa Pcs
dalam 1 Renceng?"), dengan `contentPerItem` dikunci ke `1` dan
`contentUnit` dikunci ke `PCS` di balik layar (tidak pernah memakai
"Lusin" lagi di alur ini). Produk berat/volume (Aci, minyak, dst) tidak
berubah - tetap pakai "Isi per Kemasan + Satuan" seperti sebelumnya.
Divalidasi ulang: `format`/`lint`/`typecheck`/`build` lulus.

**Bug tambahan ditemukan & diperbaiki (2026-08-21, saat diminta review
akhir):** `listOffers()` yang dipakai untuk mengisi daftar "Tambah Produk"
di halaman detail Pesanan (`pesanan/[id]/page.tsx`) tidak mengecek
`product.isActive` - sama seperti bug Bandingkan sebelumnya, tapi di titik
berbeda. Akibatnya produk yang sudah dinonaktifkan tetap bisa ditambahkan
ke pesanan BARU. Diperbaiki di dua lapis (defense in depth):

1. `OfferListFilters` dapat opsi baru `activeProductOnly` - dipakai di
   `pesanan/[id]/page.tsx` saat membangun daftar "Tambah Produk".
2. `addPurchaseOrderItem()` (`purchase-order-repository.ts`) sekarang
   menolak dengan pesan jelas kalau produk terkait sudah nonaktif - ini
   berlaku untuk SEMUA jalur (halaman Pesanan, panel "Pesan" cepat di
   Produk, dan jalur mana pun di masa depan), bukan cuma satu UI.

Divalidasi ulang: `format`/`lint`/`typecheck`/`test` (232/232)/`build`
semua lulus.

**Belum/di luar cakupan sesi ini (jujur dicatat):**

- Hapus permanen untuk Supplier itu sendiri BELUM dikerjakan (hanya
  nonaktifkan seperti sebelumnya) - tidak diminta eksplisit di sesi ini,
  cuma disinggung sekilas oleh pengguna. Bisa ditambahkan nanti dengan
  pola yang sama (cek riwayat pesanan dulu) kalau dibutuhkan.
- Preview harga di `OfferForm` sengaja TIDAK memperhitungkan status pajak
  (INCLUDED/EXCLUDED) - murni rasio harga-per-kemasan dibagi isi, supaya
  sederhana. Perhitungan pajak yang sesungguhnya tetap dilakukan di server
  saat submit (tidak berubah).
- Belum ada tes otomatis baru untuk `deleteProduct`/`deleteOffer`/
  `deletePurchaseOrder` (baru divalidasi lewat typecheck/lint/build; test
  suite yang ada, 232/232, semuanya LAMA dan tetap lulus tanpa perubahan).
  Disarankan ditambah test integrasi kalau ada waktu di sesi berikutnya.

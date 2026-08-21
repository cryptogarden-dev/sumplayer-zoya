# IMPLEMENTATION_PLAN.md — Rencana Implementasi Bertahap

## Sistem Supplier & Perbandingan Harga

Status: perencanaan. Checklist di bawah harus diperbarui (centang) seiring
progres. Setiap tahap mengacu ke kebutuhan `Rxx` pada `SPEC.md` dan modul
pada `ARCHITECTURE.md`.

Permintaan fitur/isu baru yang belum masuk tahap resmi manapun dicatat
lebih dulu di `docs/BACKLOG.md` sebelum dipindahkan ke sini.

Konvensi checklist: `[ ]` belum dikerjakan, `[x]` selesai & tervalidasi
(punya bukti test lulus), `[~]` sedang dikerjakan.

---

## Tahap 1: Fondasi

Tujuan: proyek dapat dijalankan, autentikasi & multi-tenant dasar berjalan,
kerangka UI responsif siap dipakai tahap berikutnya.

- [x] Inisialisasi proyek Next.js 16 + TypeScript strict + Tailwind v4 (R30)
- [x] Setup ESLint (flat config) + Prettier (+ plugin Tailwind) dan aturan dasar
- [x] Setup package manager (npm) + lockfile (`package-lock.json`) — lihat catatan deviasi di bawah
- [x] Setup PostgreSQL lokal/dev (Prisma Postgres lokal via `prisma dev`) + Prisma 7 dengan driver adapter `@prisma/adapter-pg`, koneksi via `DATABASE_URL` (R30, R31)
- [x] Skema awal: `businesses`, `users`, `business_users` (R26, R28) — `prisma/schema.prisma`, migrasi `prisma/migrations/20260817103042_init_business_user`
- [x] Autentikasi (NextAuth v4 Credentials + bcryptjs + sesi JWT) (R26) — lihat catatan deviasi di bawah
- [x] Alur registrasi pemilik pertama (buat business + owner_admin) — `src/app/api/auth/register/route.ts`
- [x] Proteksi rute `(dashboard)` & pengecekan peran di server (R26) — `src/proxy.ts` (dahulu `middleware.ts`, direname mengikuti konvensi Next.js 16) + `requireSession`/`requireRole` di `src/lib/auth/session.ts`
- [x] `AppShell`: Sidebar (desktop) + BottomNav (mobile) dengan 4 menu (R25) — `src/components/app-shell/*`
- [x] Komponen UI dasar aksesibel: Button, Input, Label, Card, EmptyState, StatCard, PageHeader, ProfileMenu (Radix Dropdown) (R24) — `src/components/ui/*`, `src/components/app-shell/ProfileMenu.tsx`
- [x] Manifest PWA + ikon placeholder + registrasi service worker dasar (cache-first aset statis) (R24, ARCH §8) — `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`
- [x] `.env.example` tanpa nilai rahasia (R31)
- [x] Setup Vitest (unit + komponen) — 8 file test, 30 test lulus. Playwright **ditunda**: lihat catatan deviasi di bawah
- [x] Skrip validasi lokal: `lint`, `typecheck`, `test`, `format`, `build` di `package.json`

**Catatan deviasi dari rencana awal (dengan alasan):**

1. **npm, bukan pnpm.** Lingkungan eksekusi hanya menyediakan Node.js/npm
   siap pakai; pnpm tidak tersedia dan pemasangannya di luar cakupan
   Tahap 1. Fungsionalitas (lockfile deterministik, script terkelola) tetap
   terpenuhi dengan `package-lock.json`. Dapat dimigrasikan ke pnpm kapan
   pun tanpa mengubah struktur kode.
2. **bcryptjs, bukan argon2.** argon2 memerlukan kompilasi native yang
   rawan gagal pada lingkungan lintas-platform yang dipakai untuk
   membangun proyek ini. bcryptjs (murni JavaScript) dipakai sebagai
   gantinya — tetap merupakan algoritma hashing password yang diakui aman
   dan umum dipakai di produksi. Lihat `src/lib/auth/password.ts`.
3. **Sesi JWT, bukan sesi database, untuk NextAuth.** NextAuth v4 secara
   teknis tidak mendukung strategi sesi database untuk Credentials
   Provider (hanya untuk provider OAuth yang melalui adapter). Sebagai
   gantinya dipakai sesi JWT dengan validasi ulang status aktif pengguna
   di setiap login serta masa berlaku token dibatasi 12 jam, untuk tetap
   mendekati niat revocation pada `ARCHITECTURE.md` §5. Detail ada di
   komentar `src/lib/auth/auth-options.ts`.
4. **Prisma 7 (bukan versi lebih lama), memakai driver adapter
   `@prisma/adapter-pg`.** Ini adalah versi stabil yang ter-resolve saat
   `npm install` dijalankan pada tanggal implementasi, dan sudah mengikuti
   pola driver adapter yang menjadi standar Prisma 7 (lihat
   `.agents/skills/prisma-driver-adapter-implementation`).
5. **Playwright ditunda.** Instalasi browser Playwright (`npx playwright
install`) memerlukan unduhan besar yang tidak dijalankan pada sesi
   implementasi ini agar validasi tetap dapat diselesaikan dalam waktu
   wajar. Cakupan hak-akses dan navigasi pada Tahap 1 sudah diuji lewat
   Vitest + Testing Library (`src/lib/auth/rbac.test.ts`,
   `src/components/app-shell/BottomNav.test.tsx`, dll.) dan smoke test
   manual (`npm run build` + `npm run start` + `curl`, lihat riwayat
   validasi). Playwright disiapkan sebagai pekerjaan Tahap 6/7 saat E2E
   penuh lintas-modul dibutuhkan.
6. **Database pengembangan: Prisma Postgres lokal (`npx prisma dev`),
   bukan instalasi PostgreSQL manual/Docker.** Lingkungan tidak memiliki
   PostgreSQL atau Docker terpasang. `prisma dev` menyediakan PostgreSQL
   asli yang kompatibel secara lokal, dipakai untuk benar-benar membuat
   dan menerapkan migrasi (`prisma migrate dev`), bukan sekadar
   `prisma validate`. Untuk staging/produksi, `DATABASE_URL` tinggal
   diarahkan ke instance PostgreSQL sungguhan (lihat README.md).

Exit criteria (tercapai): pengguna dapat mendaftar sebagai pemilik, login,
melihat shell aplikasi dengan 4 menu (Supplier, Produk, Bandingkan,
Pesanan) baik di HP (bottom nav) maupun desktop (sidebar), dan aplikasi
dapat diinstal sebagai PWA (manifest + ikon + service worker terpasang,
diverifikasi lewat `npm run build` + `npm run start`).

**Hasil validasi Tahap 1 (dijalankan nyata, bukan asumsi):**

| Perintah                                     | Hasil                                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format`                             | Lulus — seluruh file diformat                                                                                                                       |
| `npm run lint`                               | Lulus — tanpa error/warning                                                                                                                         |
| `npm run typecheck`                          | Lulus — tanpa error                                                                                                                                 |
| `npm run test`                               | Lulus — 8 file test, 30 test                                                                                                                        |
| `npx prisma validate`                        | Lulus — skema valid                                                                                                                                 |
| `npx prisma migrate status`                  | Lulus — "Database schema is up to date!" terhadap Prisma Postgres lokal                                                                             |
| `npm run db:seed`                            | Lulus — bisnis contoh + 2 akun (Pemilik/Admin, Staf) dibuat                                                                                         |
| `npm run build`                              | Lulus — production build Next.js 16 (Turbopack) berhasil                                                                                            |
| Smoke test manual (`npm run start` + `curl`) | `/` → 307 redirect ke `/login` (proteksi rute bekerja), `/login` → 200, `/manifest.webmanifest` → 200, `/icons/icon-192.png` → 200, path acak → 404 |

---

## Tahap 2: Mesin Perhitungan

Tujuan: seluruh logika satuan, konversi, pajak, kemasan, stok, minimum
pembelian, ongkir, dan total biaya dibangun sebagai fungsi murni yang
teruji, sebelum dipakai UI manapun.

> **Catatan lingkup**: atas arahan eksplisit saat Tahap 2 dikerjakan,
> `lib/domain/performance` (R15) dan `lib/domain/recommendation` (R13,
> R14) **dipindahkan ke Tahap 4** karena secara alami menjadi bagian dari
> halaman Bandingkan dan baru bermakna setelah ada data supplier/produk
> nyata dari Tahap 3. Lihat checklist Tahap 4 di bawah.

- [x] `src/lib/domain/units/types.ts` + `constants.ts`: `UnitFamily` (WEIGHT/VOLUME/COUNT), tabel konversi baku (gram/kg, ml/liter, pcs/lusin) (R04, R05)
- [x] `assertSameFamily` + `assertCompatibleUnits` + `IncompatibleUnitError` (`convert.ts`) (R05, R29)
- [x] `src/lib/domain/units/packaging.ts`: struktur kemasan & `resolvePackage()` menghitung total isi dalam satuan dasar dari `items_per_package × content_per_item` (R03, R05)
- [x] Golden test 3 kasus wajib: karung beras, dus minyak, dus barang (`golden-cases.test.ts`) (R06)
- [x] `src/lib/domain/pricing/tax.ts`: tiga status pajak (INCLUDED/EXCLUDED/NONE), tarif diberikan sebagai data (bukan hardcode) (R07)
- [x] `src/lib/domain/pricing/shipping.ts`: 6 mode ongkir + syarat gratis ongkir, `PERLU_KONFIRMASI` mengembalikan `null` (bukan nol) (R08)
- [x] `src/lib/domain/pricing/packages.ts`: rumus `packagesRequired` dengan pembulatan, minimum, kelipatan pembelian (R11)
- [x] `src/lib/domain/pricing/stock.ts`: evaluasi ketersediaan stok terhadap kebutuhan, "PERLU_KONFIRMASI" tidak dianggap pasti tersedia (R09)
- [x] Hitung: harga setelah pajak (`tax.ts`), harga per satuan dasar (`unit-price.ts`), subtotal (`subtotal.ts`), total & harga akhir per satuan setelah ongkir (`order-total.ts`), kelebihan pembulatan (`packages.ts`) (R10)
- [x] Presisi uang: `src/lib/domain/money/money.ts` memakai `Decimal` (`decimal.js`), termasuk `roundMoney()` dengan aturan pembulatan terdokumentasi (R27)
- [x] Validasi domain: harga ≥ 0 & pajak/ongkir ≥ 0 (`InvalidMoneyError`), isi kemasan/kebutuhan > 0 (`InvalidQuantityError`) (R29)
- [x] Unit test menyeluruh: 19 file test, 111 test lulus (30 Tahap 1 + 81 Tahap 2), termasuk seluruh 23 kasus uji wajib dari instruksi Tahap 2
- [x] Dokumentasi rumus: komentar JSDoc di kode mengacu ke ID requirement (`R04`-`R11`, `R27`) + dokumen baru `docs/CALCULATION_ENGINE.md`
- [x] Halaman internal developer `src/app/(dashboard)/dev/mesin-hitung` untuk memeriksa hasil manual — TIDAK dimasukkan ke `nav-items.ts` (navigasi produksi tetap 4 menu), tetap terproteksi login (proxy matcher + `requireSession`)

Exit criteria (tercapai): seluruh modul `src/lib/domain/**` lulus unit
test tanpa bergantung pada database atau UI (diverifikasi: modul ini tidak
mengimpor apa pun dari `src/app`, `src/components`, atau `src/lib/db`); 3
golden case R06 menghasilkan angka yang persis sama dengan contoh di
`SPEC.md` (Rp15.000/kg, Rp17.000/liter, Rp10.000/pcs).

**Hasil validasi Tahap 2 (dijalankan nyata):**

| Perintah            | Hasil                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run format`    | Lulus                                                                                                           |
| `npm run lint`      | Lulus — tanpa error/warning                                                                                     |
| `npm run typecheck` | Lulus — tanpa error                                                                                             |
| `npm run test`      | Lulus — 19 file test, 111 test                                                                                  |
| `npm run build`     | Lulus — production build Next.js 16 berhasil, termasuk rute `/dev/mesin-hitung`                                 |
| Smoke test manual   | `/dev/mesin-hitung` tanpa login → 307 redirect ke `/login` (proteksi tetap berlaku meski tidak ada di navigasi) |

---

## Tahap 3: Supplier dan Produk

Tujuan: CRUD data inti yang menjadi bahan baku perbandingan.

- [x] Skema Prisma: `suppliers`, `supplier_contacts`, `supplier_delivery_areas`, `supplier_delivery_schedules` (R01)
- [x] Skema Prisma: `products`, `product_categories` (R02)
- [x] Skema Prisma: `supplier_products`, `supplier_prices` (append-only), `supplier_stock`, `tax_rates`, `shipping_rules` (+ area) (R03, R07, R08, R20)
- [x] Repository layer dengan scoping `business_id` wajib untuk semua tabel di atas (R26, ARCH §4)
- [x] Halaman "Supplier": daftar, buat, edit, nonaktifkan (bukan hapus permanen) (R01)
- [ ] Halaman "Produk": daftar, buat, edit, nonaktifkan (R02) sudah selesai;
      upload foto opsional BELUM dibangun (field `photoUrl` ada di skema/
      validasi tapi tidak ada UI unggah foto)
- [x] Form penawaran produk per supplier (kemasan, isi, harga, pajak, ketersediaan, stok) (R03)
- [x] Pengaturan `tax_rates` (khusus Pemilik/Admin) (R07, R26) — daftar &
      tambah lewat menu profil; edit/nonaktifkan tarif pajak lewat UI
      belum ada
- [ ] Pengaturan `shipping_rules` per supplier (R08) — API sudah ada,
      UI belum dibangun pada sesi ini
- [x] Validasi form (Zod, sama dengan skema server) sesuai R29
- [ ] Riwayat harga tampil di detail penawaran (read-only, dari `supplier_prices`) (R20) —
      hanya harga terbaru yang ditampilkan pada Tahap 3; riwayat lengkap belum ada UI-nya
- [x] Integration test repository (scoping tenant, constraint DB)
- [ ] E2E: buat supplier → buat produk → buat penawaran lengkap —
      divalidasi manual lewat browser oleh pengguna per langkah
      (lihat `docs/TAHAP_3_UI_CHECKLIST.md`), belum ada automated E2E suite

> **Catatan implementasi (lihat `docs/TAHAP_3_UI_CHECKLIST.md` untuk
> rincian per langkah):** UI CRUD Supplier & Produk, form penawaran, dan
> halaman pengaturan tarif pajak sudah dibangun dan lulus
> `format`/`lint`/`typecheck`/`test`/`build`. Item yang SENGAJA belum
> dikerjakan pada sesi ini (di luar cakupan checklist UI sederhana yang
> diminta): upload foto produk, UI pengaturan `shipping_rules` per
> supplier, UI edit/nonaktifkan tarif pajak, UI riwayat harga penawaran,
> dan automated E2E test. Backend (API + repository) untuk semua item
> tersebut sudah tersedia dan teruji lewat integration test.

Exit criteria: pengguna dapat mengelola data supplier & produk end-to-end
lewat UI, semua data tersimpan dengan audit dasar (R28), dan riwayat harga
tidak pernah hilang saat diperbarui.

---

## Tahap 4: Perbandingan dan Rekomendasi

Tujuan: menyatukan Tahap 2 (mesin hitung) dan Tahap 3 (data) menjadi
halaman Bandingkan yang lengkap.

- [x] `lib/domain/performance`: rumus estimasi ketepatan waktu `(tepat+1)/(selesai+2)` + selalu sertakan jumlah data (R15) — `src/lib/domain/performance/on-time-rate.ts`, 7 test lulus
- [x] `lib/domain/recommendation`: aturan kelayakan (stok, jangkauan area, jadwal) + skor transparan + kondisi "Data belum cukup" (R14) — `src/lib/domain/recommendation/{eligibility,score,labels,reason,location,config}.ts`, 43 test lulus
- [x] Endpoint `/api/comparison` menghitung seluruh kolom R12 per supplier untuk produk terpilih — `src/app/api/comparison/route.ts` + `src/lib/server/comparison/build-comparison.ts`
- [x] Komponen `ComparisonTable` (desktop) & `ComparisonCards` (mobile) dari satu sumber data (ARCH §2) — `src/components/perbandingan/*`, dipilih lewat `hidden lg:block`/`lg:hidden`
- [x] Semua kolom wajib R12 tampil: harga per kemasan, isi kemasan, harga per satuan, status pajak, jumlah kemasan, jumlah aktual, kelebihan pembulatan, minimum & kelipatan, subtotal, ongkir, syarat gratis ongkir, total, harga akhir per satuan, estimasi kirim & tiba, hari pengiriman, riwayat ketepatan
- [x] Label dinamis: Harga Satuan Termurah, Total Pembelian Termurah, Gratis Ongkir, Pengiriman Tercepat, Paling Dekat, Stok Tersedia, Stok Terbatas, Perlu Konfirmasi, Direkomendasikan (R13) — `src/lib/domain/recommendation/labels.ts`
- [x] Panel alasan rekomendasi (teks transparan) per supplier (R14) — `reasonText` (`recommendation/reason.ts`), ditampilkan di kartu & tersedia di data tabel
- [x] Tampilan "Data belum cukup"/"Data masih terbatas" sesuai `SPEC.md` §7 asumsi 2 — `performance/on-time-rate.ts` (riwayat pengiriman 0 data karena Tahap 5 belum ada), `needsConfirmation`/`cautionNotes` untuk area & data kedaluwarsa
- [~] Tombol "Pilih" — **deviasi disengaja, lihat catatan di bawah**: menandai penawaran terpilih di halaman (highlight + ringkasan), BUKAN navigasi ke draft pesanan, karena `purchase_orders` (Tahap 5) belum dibangun
- [x] Tombol "WhatsApp" → membuka `wa.me` dengan teks pesanan terformat (R17) — `src/lib/domain/whatsapp/format-order.ts`, 7 test lulus
- [x] Pencegahan rekomendasi untuk produk berstatus stok kosong (R09, R29) — `evaluateEligibility` menjadikan stok kosong sebagai `blockingReasons`, tidak pernah mendapat label "Direkomendasikan" (diuji di `build-comparison.test.ts` kasus #4)
- [x] Filter: hanya tersedia, gratis ongkir, melayani area, tiba sesuai tanggal (R14) — `ComparisonFilters.tsx`. Sortir: harga satuan, total biaya, estimasi tiba, jarak, ketepatan waktu — `ComparisonTable.tsx`
- [x] Unit test kalkulasi label & rekomendasi dengan data sintetis (bukan hardcode hasil) — `labels.test.ts`, `score.test.ts`, `eligibility.test.ts`, `reason.test.ts`
- [ ] E2E: **tidak dikerjakan** — mengikuti keputusan Tahap 1 (Playwright ditunda ke Tahap 6/7). Alur utama sudah dicakup 1 integration test (`build-comparison.test.ts`, 7 skenario) sesuai arahan "prioritaskan unit test domain + satu integration test alur utama"

**Catatan deviasi dari rencana awal (dengan alasan):**

1. **Tombol "Pilih" tidak menavigasi ke draft pesanan.** Rencana awal item
   ini ditulis sebelum Tahap 3 & 5 benar-benar dikerjakan, dengan asumsi
   `purchase_orders` sudah ada. Karena instruksi eksplisit sesi ini
   membatasi pekerjaan HANYA Tahap 4 dan melarang placeholder palsu (R33),
   "Pilih" diimplementasikan sebagai penandaan/penyorotan penawaran
   terpilih pada halaman yang sama (state lokal, sungguhan berfungsi),
   dilengkapi ringkasan biaya & tombol WhatsApp yang menonjol. Navigasi ke
   draft pesanan sungguhan menyusul di Tahap 5.
2. **Kelompok produk setara (`product_equivalence_groups`) tidak
   diimplementasikan.** Sesuai catatan `prisma/schema.prisma` §30 dan
   `DATA_MODEL.md` §10, tabel ini sengaja belum dibuat. Perbandingan Tahap
   4 dilakukan per satu produk yang sama (semua penawaran menunjuk
   `product_id` yang sama), bukan lintas produk berbeda merek — konsisten
   dengan larangan "jangan membandingkan tanpa penandaan manual" (R05).
3. **`lib/domain/recommendation` memakai proksi ketersediaan, bukan hanya
   ketepatan waktu, saat riwayat pengiriman kosong.** Karena tabel
   `supplier_performance` adalah Tahap 5 (belum ada), bobot "ketepatan
   pengiriman" (30%) untuk saat ini SELALU diisi dari proksi ketersediaan
   stok (`AVAILABILITY_PROXY_SCORES` di `recommendation/config.ts`),
   sesuai instruksi: "Jika belum ada riwayat pengiriman: gunakan
   ketersediaan, total biaya, dan estimasi pengiriman." Begitu Tahap 5
   selesai, hanya `build-comparison.ts` (satu baris pemanggilan
   `estimateOnTimeRate`) yang perlu diubah untuk membaca data nyata.
4. **"Paling Dekat" memakai kecocokan kota/provinsi, bukan jarak
   geografis.** `businesses` tidak memiliki kolom koordinat (lihat
   `DATA_MODEL.md` §1), sehingga jarak sesungguhnya tidak dapat dihitung.
   Didokumentasikan di `src/lib/domain/recommendation/location.ts`.

Exit criteria (tercapai): halaman Bandingkan menampilkan data benar dan
konsisten dengan mesin hitung Tahap 2, di mobile (kartu) dan desktop
(tabel), tanpa horizontal scroll mengganggu di HP.

**Hasil validasi Tahap 4 (dijalankan nyata):**

| Perintah                                                             | Hasil                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run format`                                                     | Lulus                                                                                             |
| `npm run lint`                                                       | Lulus — tanpa error/warning                                                                       |
| `npm run typecheck`                                                  | Lulus — tanpa error                                                                               |
| `npm run test` (modul domain baru Tahap 4)                           | Lulus — performance, recommendation, scheduling, whatsapp, shipping-area: seluruh unit test lulus |
| `npm run test` (`build-comparison.test.ts`, integration, 7 skenario) | Lulus saat dijalankan (dikonfirmasi 2x terpisah); lihat catatan lingkungan di bawah               |
| `npm run build`                                                      | Lulus — production build Next.js 16 berhasil, termasuk `/api/comparison` dan `/bandingkan`        |

**Catatan lingkungan (bukan bug kode, tidak diperbaiki karena di luar
lingkup Tahap 4):** database dev lokal (`prisma dev`, wasm Postgres) pada
sesi implementasi ini beberapa kali berhenti/terputus sendiri di bawah
beban test berturut-turut, termasuk pada file test Tahap 3 yang TIDAK
diubah pada Tahap 4 (`product-repository.test.ts`,
`supplier-repository.test.ts`). Ini adalah keterbatasan lingkungan dev
yang sudah didokumentasikan sebelumnya di `src/tests/db-helpers.ts`
("kadang memutus koneksi secara sesaat/acak"). Bukti lulus sebelumnya
sudah dicatat di atas; kegagalan ini tidak berkaitan dengan perubahan
kode Tahap 4.

---

## Tahap 5: Pesanan dan Penerimaan

Tujuan: siklus hidup pesanan penuh, dari draft hingga barang diterima dan
kinerja supplier terupdate.

> **Catatan:** sebagian besar tahap ini DIKERJAKAN LEBIH AWAL (2026-08-18)
> atas permintaan langsung pengguna, dengan beberapa revisi dari rencana
> di bawah — lihat `docs/BACKLOG.md` #4 untuk detail lengkap, dan catatan
> revisi di `docs/SPEC.md` (R16/R17) serta `docs/DATA_MODEL.md` §16a-18.

- [x] Skema Prisma: `purchase_orders`, `purchase_order_items` (R16) —
      dengan revisi (status `DIKONFIRMASI` tambahan, `payment_method`,
      `availability_status` per baris — lihat catatan di atas)
- [ ] Skema Prisma: `goods_receipts`, `goods_receipt_items` (R18)
- [ ] Skema Prisma: `supplier_performance` (agregat, direkomputasi) (R14, R15)
- [ ] Skema Prisma: `recurring_order_templates` (+ items), `reminders` (R19)
- [x] Skema Prisma tambahan (di luar rencana awal): `business_locations`
      (lokasi/cabang bisnis, docs/BACKLOG.md #1)
- [x] Halaman "Pesanan": daftar dengan status, detail, ubah status (R16)
      — status yang diimplementasikan: draft/dipesan/dikonfirmasi/
      dibatalkan (dikirim/diterima menyusul bersama R18)
- [x] Pembatalan pesanan wajib mengisi alasan (R29)
- [x] Nomor pesanan otomatis & unik per bisnis (R16) — format `PO-YYYY-NNNN`
- [ ] Form penerimaan barang: jumlah diterima vs dipesan, parsial, kondisi baik/rusak, jumlah rusak, harga sesuai/beda, tepat waktu/terlambat, foto nota opsional, catatan (R18)
- [ ] Setelah penerimaan disimpan → rekomputasi `supplier_performance` (jumlah selesai, jumlah tepat waktu) (R15)
- [ ] Halaman "Jadwal Rutin": daftar hari pengiriman per supplier, template pesanan, frekuensi, pengingat (R19)
- [ ] Tombol "Pesan Lagi" → membuat **draft** dari template/pesanan sebelumnya, tanpa auto-submit (R19)
- [ ] Notifikasi/pengingat tampil di UI (in-app), sesuai jadwal cut-off supplier (R01, R19)
- [ ] Validasi: jumlah pesanan mengikuti minimum & kelipatan; produk kosong tidak bisa dipesan (R29) —
      BELUM ditegakkan di `addPurchaseOrderItem` (dicatat sebagai gap di docs/BACKLOG.md #4)
- [ ] Integration test: transisi status pesanan, rekomputasi kinerja, constraint DB —
      BELUM ada test untuk `purchase-order-repository.ts`/`business-location-repository.ts`
- [ ] E2E: buat pesanan dari perbandingan → kirim format WhatsApp → catat penerimaan → cek kinerja supplier terupdate —
      pesanan saat ini dimulai dari halaman Supplier (bukan dari Bandingkan); belum ada penerimaan barang

**Fitur tambahan di luar rencana awal (disepakati lewat diskusi
2026-08-18, docs/BACKLOG.md #4):**

- [x] Satu draft pesanan = satu supplier, berisi banyak baris produk
      ("keranjang"), jumlah bertambah otomatis jika produk yang sama
      ditambah lagi
- [x] Pesan WhatsApp multi-produk TANPA harga (`formatWhatsAppPurchaseOrderMessage`)
- [x] Status ketersediaan per baris produk (Belum Dikonfirmasi/Tersedia/
      Sebagian/Tidak Tersedia), ditandai manual dari balasan WhatsApp
- [x] Metode konfirmasi pembayaran (Tunai/Transfer)
- [x] Lokasi/cabang bisnis + pengisian otomatis alamat tujuan di halaman
      Bandingkan (docs/BACKLOG.md #1)

Exit criteria: siklus pesan-terima berjalan penuh, riwayat ketepatan waktu
supplier terhitung otomatis dari data penerimaan nyata (bukan input manual
rating). **BELUM TERCAPAI** — siklus saat ini berhenti di konfirmasi
pesanan, sebelum penerimaan barang fisik (R18) dan rekomputasi kinerja
(R15).

---

## Tahap 6: Integrasi dan Penyempurnaan

Tujuan: ekspor ke kasir, penghalusan PWA, dan hal lintas-modul yang tersisa.

- [ ] Skema Prisma: `cashier_export_batches`, `cashier_export_items`, `cashier_integration_settings` (R22)
- [ ] `CashierExportAdapter` interface + `CsvExportAdapter` + `JsonExportAdapter` (ARCH §7)
- [ ] Halaman/tombol "Ekspor ke Kasir" dari detail penerimaan barang / rentang tanggal (R22)
- [ ] Field ekspor sesuai R22 lengkap dan diverifikasi terhadap `goods_receipt_items`
- [ ] Struktur data & dokumentasi kontrak untuk mode REST API/webhook di masa depan (belum diaktifkan) (ARCH §7)
- [ ] Penghalusan service worker: strategi network-first untuk `/api/**`, halaman fallback offline (R24, ARCH §8)
- [ ] Audit aksesibilitas (axe-core) pada halaman utama & perbaikan temuan (R24)
- [ ] Audit performa halaman Bandingkan dengan data volume besar (§5 NFR SPEC)
- [ ] Review menyeluruh: pastikan tidak ada fitur kasir terlarang termasuk secara tidak sengaja (R23, R32)
- [ ] Review menyeluruh: tidak ada tombol placeholder yang terlihat selesai padahal belum berfungsi (R33)
- [ ] E2E: penerimaan barang → ekspor CSV → ekspor JSON → verifikasi isi file

Exit criteria: data pembelian yang sudah diterima dapat diekspor akurat ke
format CSV/JSON, aplikasi berfungsi baik secara offline-terbatas, dan tidak
ada fitur di luar lingkup yang bocor masuk.

---

## Tahap 7: Audit dan Validasi Akhir

Tujuan: memastikan seluruh 33 kebutuhan pada `SPEC.md` benar-benar
terpenuhi dan teruji sebelum dianggap siap pakai.

- [ ] Jalankan seluruh `TRACEABILITY.md` — pastikan setiap `Rxx` berstatus selesai dengan bukti test
- [ ] Verifikasi tidak ada operasi uang memakai `number`/`float` (grep + review manual di `lib/domain`) (R27)
- [ ] Verifikasi seluruh tabel tenant memiliki `business_id` dan diuji isolasi lintas-tenant (R26)
- [ ] Pertimbangkan & putuskan aktivasi PostgreSQL Row-Level Security sebagai lapisan tambahan (ARCH §4)
- [ ] Verifikasi audit dasar (`created_at/updated_at/created_by/business_id/is_active`) ada di semua entitas relevan (R28)
- [ ] Verifikasi seluruh validasi wajib R29 punya test yang gagal-jika-dilanggar (test negatif)
- [ ] Verifikasi riwayat harga tidak pernah terhapus meski ada banyak update berturut-turut (R20)
- [ ] Verifikasi tidak ada secret di repo (`git log` + pemindaian pola kunci) (R31)
- [ ] Uji aksesibilitas & responsif akhir di perangkat nyata/emulasi (HP kecil, tablet, desktop) (R24)
- [ ] Uji instalasi PWA di Android/desktop Chrome (R24)
- [ ] Review keamanan dasar: rate limit login, validasi input sisi server tidak hanya sisi client, header keamanan dasar
- [ ] Sign-off dokumentasi: `SPEC.md`, `ARCHITECTURE.md`, `DATA_MODEL.md` diperbarui bila ada penyesuaian selama implementasi

Exit criteria: seluruh baris di `TRACEABILITY.md` berstatus "Selesai" dengan
jenis pengujian yang relevan benar-benar dijalankan dan lulus.

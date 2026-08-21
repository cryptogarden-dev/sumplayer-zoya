# Checklist Sederhana — UI Supplier & Produk (Tahap 3)

Tujuan: bikin halaman `/supplier` dan `/produk` bisa dipakai sungguhan
lewat browser. Backend/API-nya SUDAH ADA semua — pekerjaan ini HANYA
membuat tampilan (form + tabel) yang memanggil API yang sudah ada.

**Cara kerja:** kerjakan satu langkah, tes di browser, centang `[x]`,
tulis 1-2 baris catatan di bawah langkah itu (apa yang dibuat, file apa),
baru lanjut langkah berikutnya. Jangan lompat ke langkah berikutnya
sebelum langkah sekarang benar-benar bisa dipakai.

Referensi contoh kode yang sudah jadi (tiru gaya/pola ini):

- Komponen dasar: `src/components/ui/{Button,Input,Select,Card,Label,PageHeader,EmptyState}.tsx`
- Contoh form client component yang fetch ke API sendiri: `src/components/perbandingan/ComparisonForm.tsx` dan `ComparisonView.tsx`
- API yang sudah tersedia (jangan bikin ulang, tinggal `fetch()`):
  - `GET/POST /api/suppliers`, `GET/PATCH /api/suppliers/[id]`, `PATCH /api/suppliers/[id]/status`
  - `GET/POST /api/products`, `GET/PATCH /api/products/[id]`, `PATCH /api/products/[id]/status`, `GET/POST /api/product-categories`
  - `GET/POST /api/supplier-products`, `PATCH .../[id]`, `.../price`, `.../stock`
  - `GET/POST /api/tax-rates`, `PATCH /api/tax-rates/[id]`

---

## Langkah 1 — Daftar Supplier (baca saja, belum ada tambah data)

- [x] Ganti `src/app/(dashboard)/supplier/page.tsx`: ambil data langsung
      lewat `listSuppliers()` (Server Component, pola sama seperti
      Beranda), tampilkan sebagai kartu sederhana (nama, kota, kontak,
      jumlah produk, status aktif).
- [ ] Tes: buka `/supplier`, harus muncul 3 supplier dari data seed
      (CV Sumber Pangan Jaya, Toko Sembako Makmur, UD Barokah Distribusi).
      **-> Tolong dicoba dan konfirmasi ke saya.**

Catatan setelah selesai: kode selesai, lulus lint & typecheck. Belum
dicoba manual di browser oleh pengguna.

## Langkah 2 — Form Tambah Supplier

- [x] Buat `src/components/supplier/SupplierForm.tsx` (nama, no. HP/WA,
      alamat, provinsi, kota, estimasi lama kirim) yang `POST` ke
      `/api/suppliers`, lalu redirect ke `/supplier`. Halaman baru:
      `src/app/(dashboard)/supplier/baru/page.tsx`. Tombol "Tambah
      Supplier" ditambahkan di halaman daftar.
- [ ] Tes: buka `/supplier`, klik "Tambah Supplier", isi form, submit.
      Harus kembali ke `/supplier` dan supplier baru muncul di daftar.
      **-> Tolong dicoba dan konfirmasi ke saya.**

Catatan setelah selesai: kode selesai, lulus lint & typecheck. Belum
dicoba manual di browser oleh pengguna.

## Langkah 3 — Edit & Nonaktifkan Supplier

- [x] Halaman `/supplier/[id]`: tampilkan data, form edit (`PATCH
/api/suppliers/[id]`), tombol nonaktifkan (`PATCH
/api/suppliers/[id]/status`).
- [x] Tes: edit nama supplier, cek berubah. Nonaktifkan satu, cek hilang
      dari daftar utama.

Catatan setelah selesai: `src/app/(dashboard)/supplier/[id]/page.tsx` +
`SupplierEditForm.tsx` + `SupplierStatusButton.tsx` sudah ada dan
berfungsi. Diperbaiki juga bug tampilan nama supplier dobel di kartu
daftar (`src/app/(dashboard)/supplier/page.tsx`). Sudah dites di
browser oleh pengguna, lulus lint & typecheck.

## Langkah 4 — Daftar & Form Tambah Produk

- [x] Sama seperti Langkah 1+2 tapi untuk `src/app/(dashboard)/produk/page.tsx`
      memakai `/api/products`.
- [x] Tes: muncul Beras Premium & Minyak Goreng dari seed, bisa tambah
      produk baru.

Catatan setelah selesai: `src/app/(dashboard)/produk/page.tsx` diganti
dari EmptyState menjadi daftar kartu produk (nama, SKU, merek, kategori,
jenis satuan, jumlah penawaran supplier, status aktif) + tombol "Tambah
Produk". Form baru: `src/components/produk/ProductForm.tsx` (SKU, nama,
merek, varian, kategori, jenis satuan) yang `POST` ke `/api/products`,
halaman `src/app/(dashboard)/produk/baru/page.tsx` mengambil daftar
kategori lewat `listProductCategories()` untuk dropdown. Tambah label
Indonesia `UNIT_FAMILY_LABELS` di `src/lib/format/units.ts`. Lulus lint
& typecheck. Sudah dites di browser oleh pengguna.

## Langkah 5 — Edit & Nonaktifkan Produk

- [x] Sama seperti Langkah 3, untuk produk (`/api/products/[id]`,
      `/api/products/[id]/status`).
- [x] Tes: edit nama produk, cek berubah. Nonaktifkan satu, cek hilang
      dari daftar utama.

Catatan setelah selesai: Halaman `src/app/(dashboard)/produk/[id]/page.tsx`

- `src/components/produk/ProductEditForm.tsx` (PATCH `/api/products/[id]`)
- `src/components/produk/ProductStatusButton.tsx` (PATCH
  `/api/products/[id]/status`), pola sama seperti Supplier Langkah 3.
  Kartu di `/produk` sekarang jadi link ke `/produk/[id]`. Lulus lint &
  typecheck. Sudah dites di browser oleh pengguna.

## Langkah 6 — Form Penawaran (Supplier + Produk + Harga)

- [x] Dari halaman detail Produk ATAU Supplier, tambah form: pilih
      supplier & produk, isi kemasan (jenis, isi per kemasan, satuan),
      harga, status pajak, status stok → `POST /api/supplier-products`.
- [ ] Tes: tambah penawaran baru, cek muncul di halaman Bandingkan.
      **-> Belum dikonfirmasi tes manual di browser - pengguna meminta
      lanjut ke langkah berikutnya sebelum konfirmasi. Mohon tetap
      dicoba dan dikabari jika ada masalah.**

Catatan setelah selesai: Ditambahkan di halaman detail Produk
(`src/app/(dashboard)/produk/[id]/page.tsx`): daftar penawaran yang
sudah ada (kartu ringkas per supplier) + form baru
`src/components/produk/OfferForm.tsx` (pilih supplier, jenis kemasan,
isi per kemasan, satuan mengikuti jenis satuan produk, minimum/
kelipatan pembelian, harga, status pajak + tarif pajak, status & jumlah
stok) yang `POST` ke `/api/supplier-products`. Daftar tarif pajak
diambil lewat `listTaxRates()`. Lulus lint & typecheck. Belum dicoba
manual di browser oleh pengguna.

## Langkah 7 (opsional, boleh belakangan) — Pengaturan Tarif Pajak

- [x] Halaman sederhana daftar & tambah `tax_rates` (`/api/tax-rates`),
      khusus role Pemilik/Admin.
- [ ] Tes: buka menu profil (kanan atas) sebagai Pemilik/Admin, klik
      "Tarif Pajak", tambah tarif baru, cek muncul di daftar. Login
      sebagai Staf, cek menu itu tidak ada dan `/pengaturan/pajak`
      redirect ke halaman tidak berhak.
      **-> Tolong dicoba dan konfirmasi ke saya.**

Catatan setelah selesai: Halaman baru
`src/app/(dashboard)/pengaturan/pajak/page.tsx` (dijaga
`requireRole(ONLY_OWNER_ADMIN)`) + `src/components/pajak/TaxRateForm.tsx`
(POST `/api/tax-rates`). SENGAJA tidak dimasukkan ke Sidebar/BottomNav
karena R25 membatasi menu utama hanya 4 item - diakses lewat menu
profil (`ProfileMenu.tsx`), hanya tampil untuk role Pemilik/Admin.
Tambah ikon `receipt` baru di `NavIcon.tsx`. Lulus lint & typecheck.
Belum dicoba manual di browser oleh pengguna.

---

## Setelah semua langkah di atas selesai

- [x] Jalankan: `npm run format && npm run lint && npm run typecheck && npm run test && npm run build` — semua harus lulus.
      (Dijalankan terpisah pada 2026-08-18: format, lint, typecheck lulus,
      test 232/232 lulus, build sukses untuk semua route termasuk
      `/produk/[id]`, `/produk/baru`, `/pengaturan/pajak`.)
- [x] Update centang di `docs/IMPLEMENTATION_PLAN.md` bagian Tahap 3 dan
      baris R01/R02/R03/R07/R08 di `docs/TRACEABILITY.md`.

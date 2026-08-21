# ARCHITECTURE.md — Arsitektur Sistem

## Sistem Supplier & Perbandingan Harga

Status proyek saat pemeriksaan: **folder kosong** (tidak ada kode sebelumnya).
Karena itu, stack di bawah dipilih sesuai R30 dan menjadi acuan resmi untuk
implementasi berikutnya — bukan asumsi yang perlu digantikan tanpa alasan
kuat.

---

## 1. Pilihan Teknologi & Alasan

| Lapisan              | Pilihan                                                                                                                | Alasan                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Framework aplikasi   | Next.js (App Router), versi stabil terbaru                                                                             | Satu basis kode untuk frontend + backend (Route Handlers), dukungan SSR/PWA baik, sesuai R30                  |
| Bahasa               | TypeScript (`strict: true`)                                                                                            | Keamanan tipe untuk domain uang & satuan yang rawan kesalahan                                                 |
| Styling              | Tailwind CSS                                                                                                           | Utility-first, cepat untuk desain mobile-first responsif                                                      |
| Komponen UI          | Radix UI primitives (via pola shadcn/ui)                                                                               | Aksesibel secara default (ARIA, keyboard nav), tidak mengunci gaya visual                                     |
| Form & validasi      | React Hook Form + Zod                                                                                                  | Validasi skema yang sama dipakai di client & server (satu sumber kebenaran)                                   |
| Database             | PostgreSQL                                                                                                             | Tipe `numeric` presisi tetap untuk uang, dukungan constraint kuat, matang untuk multi-tenant                  |
| ORM                  | Prisma                                                                                                                 | Migrasi terkelola, tipe hasil query otomatis, `Decimal` type map ke `numeric`                                 |
| Autentikasi          | Auth.js (NextAuth v5) — Credentials Provider + session database                                                        | Mendukung RBAC kustom, tidak bergantung pihak ketiga berbayar, dapat memvalidasi `business_id` di setiap sesi |
| Hashing password     | argon2 (fallback bcrypt bila constraint hosting)                                                                       | Standar modern untuk hash password                                                                            |
| PWA                  | Manifest kustom + Service Worker berbasis Workbox (mis. `@ducanh2912/next-pwa` atau setara yang kompatibel App Router) | Instalasi PWA, caching offline terkendali                                                                     |
| Uang                 | `Decimal` dari `decimal.js` (independen dari Prisma) di `src/lib/domain`, `numeric(18,2)` di DB                        | Menghindari galat floating point (R27); domain module tetap murni tanpa bergantung ORM                        |
| Unit test            | Vitest + Testing Library                                                                                               | Cepat, kompatibel TypeScript/ESM                                                                              |
| Integration/E2E test | Playwright                                                                                                             | Menguji alur lintas-halaman (buat supplier → bandingkan → pesan → terima)                                     |
| Package manager      | pnpm (dengan lockfile `pnpm-lock.yaml`)                                                                                | Instalasi cepat, hemat disk, deterministik                                                                    |

Semua versi harus dikunci ke rilis stabil terbaru yang saling kompatibel
saat Tahap 1 dimulai, dan dicatat di `package.json` + lockfile.

Jika di kemudian hari ditemukan kode yang sudah ada di proyek ini sebelum
Tahap 1 dimulai, keputusan pada dokumen ini **harus ditinjau ulang** dan
diselaraskan dengan pola yang sudah ada, bukan langsung ditimpa.

---

## 2. Arsitektur Frontend

```
app/
  (auth)/
    login/
    register/                 # hanya untuk pemilik pertama; staf diundang oleh admin
  (dashboard)/
    layout.tsx                # shell: sidebar (desktop) / bottom-nav (mobile)
    supplier/
      page.tsx                # daftar supplier
      [id]/page.tsx           # detail + edit supplier
      baru/page.tsx
    produk/
      page.tsx
      [id]/page.tsx
      baru/page.tsx
    bandingkan/
      page.tsx                # tabel (desktop) / kartu (mobile) — sama komponen data, beda presentasi
    pesanan/
      page.tsx                # daftar pesanan
      [id]/page.tsx           # detail, penerimaan barang, ekspor kasir
      jadwal-rutin/page.tsx
  api/
    ...route handlers backend (lihat §3)
components/
  ui/                          # primitive aksesibel (Button, Dialog, Table, Card, dst.)
  supplier/
  produk/
  perbandingan/
  pesanan/
lib/
  domain/                      # LOGIKA MURNI, tanpa dependensi Next.js (lihat §6)
    units/
    pricing/
    recommendation/
    performance/
  server/                      # akses data: repository per entitas, dibungkus Prisma
  auth/
  validation/                  # skema Zod bersama client & server
```

Prinsip kunci:

- **Mobile-first**: breakpoint Tailwind `sm/md/lg` dipakai untuk menaikkan
  kompleksitas UI, bukan menurunkannya. Layout dasar dirancang untuk layar
  kecil dahulu.
- **Navigasi**: komponen `AppShell` merender `BottomNav` di bawah `lg`
  breakpoint dan `Sidebar` di atasnya, berbagi sumber data menu yang sama
  (4 item sesuai R25) agar tidak pernah tidak sinkron.
- **Kartu vs Tabel di halaman Bandingkan**: satu hook data
  (`useComparisonData`) menghasilkan data yang sama; dua komponen presentasi
  (`ComparisonCards`, `ComparisonTable`) dipilih lewat CSS responsive
  (`hidden lg:block` / `lg:hidden`), bukan dua permintaan data terpisah.
- **Tombol besar & area sentuh** ditegakkan lewat token desain Tailwind
  (`min-h-11 min-w-11` pada varian tombol utama).
- **Tidak ada horizontal scroll mengganggu**: tabel desktop dibungkus
  `overflow-x-auto` hanya di dalam container-nya sendiri, dan versi mobile
  memakai kartu, bukan tabel yang di-scroll horizontal.

---

## 3. Arsitektur Backend

Backend berjalan sebagai Next.js Route Handlers (`app/api/**/route.ts`),
disusun berlapis:

```
Route Handler (HTTP, auth check, parsing request)
      ↓
Service layer (lib/domain/*)         ← logika bisnis murni, dapat diuji unit
      ↓
Repository layer (lib/server/repositories/*)  ← query Prisma, scoping business_id
      ↓
PostgreSQL
```

Aturan:

- Route Handler **tidak boleh** berisi logika perhitungan (pajak, konversi
  satuan, rekomendasi) secara langsung — semua itu didelegasikan ke
  `lib/domain`, agar dapat diuji tanpa server berjalan dan agar aturan
  bisnis punya satu sumber kebenaran.
- Setiap query repository **wajib** menyertakan filter `business_id` yang
  diambil dari sesi terautentikasi, tidak pernah dari input klien. Ini
  adalah baris pertahanan utama untuk isolasi multi-tenant (R26).
- Endpoint mengikuti REST konvensional per entitas
  (`/api/suppliers`, `/api/products`, `/api/supplier-products`,
  `/api/purchase-orders`, `/api/goods-receipts`, `/api/exports`, dst.),
  agar mudah diperluas menjadi API publik di masa depan bila diperlukan.
- Semua input divalidasi dengan skema Zod yang sama dipakai di form client
  (single source of truth untuk aturan pada R29).

---

## 4. Database & Multi-Tenant

- PostgreSQL tunggal, skema dipisah secara logis lewat kolom `business_id`
  pada tiap tabel milik tenant (bukan skema-per-tenant, agar migrasi &
  operasional tetap sederhana pada skala UKM).
- Setiap tabel tenant memiliki index pada `business_id` (dan kombinasi
  yang relevan, lihat `DATA_MODEL.md`).
- Lapisan repository menjadi _satu-satunya_ jalur akses data dari Route
  Handler, sehingga scoping `business_id` konsisten. Sebagai lapisan
  pertahanan tambahan yang direkomendasikan untuk Tahap 7 (audit akhir):
  aktifkan **PostgreSQL Row-Level Security (RLS)** memakai
  `current_setting('app.business_id')` yang diset per koneksi/transaksi.
- Rincian tabel, relasi, constraint, dan index ada di `DATA_MODEL.md`.

---

## 5. Autentikasi & Otorisasi

- **Autentikasi**: Auth.js Credentials Provider — email + password (hash
  argon2). Sesi disimpan di database (`sessions` table dikelola Auth.js
  adapter Prisma) agar dapat dicabut sewaktu-waktu (mis. saat staf
  dinonaktifkan).
- **Registrasi**: hanya pemilik pertama yang mendaftarkan bisnis baru
  (membuat baris `businesses` + `users` + `business_users` dengan peran
  `owner_admin` dalam satu transaksi). Staf ditambahkan oleh
  Pemilik/Admin dari dalam aplikasi (bukan self-register), untuk menjaga
  kontrol akses.
- **Otorisasi (RBAC)**: middleware Next.js memeriksa sesi valid untuk semua
  rute `(dashboard)` dan `api`, kecuali `(auth)`. Helper
  `requireRole(session, ["owner_admin"])` dipakai pada endpoint yang
  membatasi aksi (mis. mengubah `tax_rates`, menghapus supplier,
  mengelola staf) khusus Pemilik/Admin.
- **Isolasi bisnis**: `business_id` aktif disimpan di sesi (dipilih saat
  login bila pengguna punya akses ke >1 bisnis). Semua repository memakai
  nilai ini, bukan nilai dari body/query request.
- **Keamanan tambahan**: rate limiting pada endpoint login, CSRF token
  bawaan Auth.js untuk form berbasis cookie, secret (`AUTH_SECRET`,
  `DATABASE_URL`, dll.) hanya lewat environment variable (R31), tidak
  pernah dikomit (`.env` masuk `.gitignore`, sediakan `.env.example`).

---

## 6. Strategi Perhitungan Uang & Satuan

### 6.1 Uang

- Tipe kolom DB: `numeric(18,2)` untuk nilai final (Rupiah tidak memakai
  sen), `numeric(18,4)` untuk nilai perantara yang butuh presisi lebih
  (mis. harga per satuan hasil pembagian) sebelum dibulatkan untuk
  ditampilkan.
- Di kode: seluruh aritmetika uang memakai `Decimal` dari **`decimal.js`**
  (dipilih final pada Tahap 2, independen dari Prisma agar
  `src/lib/domain/**` tidak bergantung pada ORM/database — lihat
  `src/lib/domain/money/money.ts`), **dilarang** memakai `number`
  JavaScript untuk operasi kali/bagi/jumlah nilai uang. Aturan ini
  ditegakkan lewat review checklist Tahap 2 (sudah diverifikasi: seluruh
  modul `src/lib/domain/**` memakai `Decimal`, tidak ada operator
  aritmetika langsung pada `number` untuk nilai uang).
- Pembulatan: `roundMoney()` (round half up, lihat
  `docs/CALCULATION_ENGINE.md` §2) hanya dipakai di lapisan
  presentasi/output akhir, tidak pernah pada nilai antara yang masih akan
  dipakai untuk perhitungan lanjutan atau pada data yang disimpan.

### 6.2 Satuan & Konversi

**Status: diimplementasikan pada Tahap 2.** Rincian lengkap rumus, tabel
konversi, dan referensi kasus uji ada di `docs/CALCULATION_ENGINE.md`.
Ringkasan:

- `src/lib/domain/units/types.ts`: `UnitFamily = "WEIGHT" | "VOLUME" |
"COUNT"`.
- `src/lib/domain/units/constants.ts`: tabel referensi statis (bukan tabel
  yang diedit tarif seperti pajak, karena ini konstanta fisik, bukan
  kebijakan bisnis):
  - WEIGHT: gram (faktor 0,001), kilogram (basis).
  - VOLUME: mililiter (faktor 0,001), liter (basis).
  - COUNT: pcs (basis), lusin (faktor 12).
- `src/lib/domain/units/convert.ts`: fungsi murni `toBaseUnit(qty, unit)`
  dan `assertSameFamily(a, b)` / `assertCompatibleUnits(unitA, unitB)` yang
  melempar error domain (`IncompatibleUnitError`) jika family berbeda —
  penegakan aturan "kg tidak boleh dibandingkan dengan liter" (R05) di
  level kode, bukan hanya validasi form.
- `src/lib/domain/units/packaging.ts`: `resolvePackage()` menghitung total
  isi kemasan (`items_per_package × content_per_item`) dan
  menormalisasikannya ke `base_unit` — kemasan supplier (dus, pak, karung,
  dll.) sendiri bersifat deskriptif, tidak punya faktor konversi baku.
- `src/lib/domain/pricing/**` mengimplementasikan rumus R10/R11 sebagai
  fungsi murni dengan input/output eksplisit, dites lewat 3 golden case
  R06 plus 23 kasus uji wajib (minimum pembelian, kelipatan pembelian,
  stok, ongkir, pajak — lihat `docs/CALCULATION_ENGINE.md` §9).

### 6.3 Pajak

**Status: diimplementasikan pada Tahap 2.**

- `src/lib/domain/pricing/tax.ts`: menerima `taxStatus`, `taxRatePercent`
  (diberikan sebagai data oleh pemanggil — snapshot historis pada
  `supplier_prices`, bukan hardcode) dan mengembalikan harga
  sebelum/sesudah pajak. Tarif aktif untuk entri baru diambil dari
  `tax_rates` milik bisnis yang sedang login (R07) — pengambilan dari
  tabel `tax_rates` sendiri baru diimplementasikan di Tahap 3 saat model
  data supplier/produk dibangun; Tahap 2 hanya menyediakan fungsi
  perhitungannya.

---

## 7. Integrasi Kasir

- Aplikasi ini tidak memanggil aplikasi kasir secara langsung (R21).
- Modul `lib/domain/cashier-export` mendefinisikan tipe data ekspor sesuai
  R22 (`CashierExportRecord`) dan sebuah interface adapter:

```ts
interface CashierExportAdapter {
  export(records: CashierExportRecord[]): Promise<ExportResult>;
}
```

- Implementasi Tahap 6: `CsvExportAdapter`, `JsonExportAdapter` (menulis
  file yang dapat diunduh pengguna).
- Disiapkan namun **tidak diimplementasikan penuh** pada rilis awal:
  `RestApiExportAdapter`, `WebhookExportAdapter` — interface dan tabel
  `cashier_integration_settings` (lihat `DATA_MODEL.md`) sudah dirancang
  agar penambahan mode ini tidak mengubah skema data inti.
- Setiap ekspor dicatat di `cashier_export_batches` untuk audit (kapan,
  oleh siapa, cakupan penerimaan barang mana saja).

---

## 8. PWA

- `public/manifest.webmanifest`: nama aplikasi, ikon (192/512, maskable),
  `display: standalone`, `theme_color`, `background_color`, `start_url`.
- Service worker (Workbox via plugin Next.js yang kompatibel App Router):
  - **Network-first** untuk permintaan API (`/api/**`) — data harga/stok
    harus selalu diusahakan terbaru; fallback ke cache hanya saat offline,
    dengan indikator jelas "data mungkin tidak terbaru".
  - **Cache-first** untuk aset statis (JS/CSS/font/ikon).
  - **Halaman fallback offline** sederhana bila navigasi gagal total tanpa
    cache yang relevan.
  - Aksi tulis (submit form) tidak di-queue background sync pada rilis
    awal — ditolak dengan pesan jelas saat offline, untuk menghindari
    duplikasi pesanan tanpa sepengetahuan pengguna (selaras R19: tidak ada
    aksi otomatis tanpa persetujuan eksplisit).

---

## 9. Testing Strategy

| Jenis         | Alat                                        | Cakupan                                                                                                                                                                                                                                           |
| ------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit          | Vitest                                      | `src/lib/domain/units`, `src/lib/domain/pricing` — **selesai Tahap 2**, 111 test lulus, termasuk 3 golden case R06 dan 23 kasus uji wajib (lihat `docs/CALCULATION_ENGINE.md`). `src/lib/domain/recommendation`/`performance` dijadwalkan Tahap 4 |
| Integration   | Vitest + test DB (PostgreSQL via container) | Repository layer: scoping `business_id`, constraint DB (min pembelian, non-negatif, dst.)                                                                                                                                                         |
| E2E           | Playwright                                  | Alur: login → buat supplier → buat produk → buat penawaran → bandingkan → buat pesanan → terima barang → ekspor kasir                                                                                                                             |
| Aksesibilitas | axe-core (terintegrasi Playwright)          | Halaman utama bebas pelanggaran WCAG AA kritikal                                                                                                                                                                                                  |

---

## 10. Struktur Folder Tingkat Atas (rencana)

```
zoya real/
  docs/                    # dokumen perencanaan (ada sekarang)
  prisma/
    schema.prisma
    migrations/
  src/
    app/
    components/
    lib/
    server/ (bila dipisah dari lib untuk kejelasan)
    tests/
  public/
    manifest.webmanifest
    icons/
  .env.example
  package.json
  pnpm-lock.yaml
  tsconfig.json
  tailwind.config.ts
```

Struktur final akan ditentukan saat Tahap 1, mengikuti konvensi Next.js
App Router terbaru pada saat implementasi dimulai.

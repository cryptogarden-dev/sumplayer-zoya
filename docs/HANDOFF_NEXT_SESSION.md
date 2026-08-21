# HANDOFF — Prompt untuk Sesi Agent Berikutnya

Copy-paste blok di bawah ini sebagai pesan pertama ke agent (Claude/lainnya) di sesi baru.

---

## PROMPT

Proyek ini ada di folder `zoya real` (Next.js 16 + TypeScript + Prisma 7 +
PostgreSQL, di Supabase). Baca dulu `docs/SPEC.md`, `docs/ARCHITECTURE.md`,
`docs/IMPLEMENTATION_PLAN.md`, `docs/TRACEABILITY.md` sebelum mulai.

**Status saat ini:**

- Tahap 1 (Fondasi): selesai — auth, AppShell, PWA dasar.
- Tahap 2 (Mesin Perhitungan, `src/lib/domain/**`): selesai & teruji penuh.
- Tahap 3 (Supplier & Produk): **backend/API sudah lengkap** (skema Prisma,
  repository di `src/lib/server/repositories/**`, route di
  `src/app/api/{suppliers,products,supplier-products,tax-rates}/**`,
  validasi Zod di `src/lib/validation/**`), TAPI **halaman UI-nya
  (`src/app/(dashboard)/supplier/page.tsx` dan `.../produk/page.tsx`)
  MASIH placeholder `EmptyState`**, belum ada form CRUD sungguhan. Ini
  pekerjaan yang BELUM SELESAI dan paling mendesak untuk dilanjutkan.
- Tahap 4 (Perbandingan & Rekomendasi, halaman `/bandingkan`): **selesai**
  — mesin `lib/domain/{performance,recommendation,scheduling,whatsapp}`,
  endpoint `GET /api/comparison`, komponen
  `src/components/perbandingan/**`. Sudah divalidasi: lint, typecheck,
  build, dan unit test domain semua lulus.
- Tahap 5-7: belum dikerjakan (pesanan/penerimaan barang, ekspor kasir,
  audit akhir).

**Tugas yang perlu dikerjakan sekarang: selesaikan Tahap 3 — UI CRUD
Supplier & Produk**, supaya pengguna bisa menambah supplier/produk/
penawaran lewat browser (bukan hanya lewat API/seed script). Sudah ada
seluruh backend-nya, jadi ini murni membuat komponen form + halaman yang
memanggil API yang sudah ada:

1. Halaman `/supplier`: daftar (pakai `GET /api/suppliers`), form tambah
   (`POST /api/suppliers`), halaman detail/edit (`GET/PATCH
/api/suppliers/[id]`), tombol nonaktifkan (`PATCH
/api/suppliers/[id]/status`), kelola kontak/area/jadwal/aturan ongkir
   (endpoint sudah ada di `src/app/api/suppliers/[id]/**`).
2. Halaman `/produk`: daftar (`GET /api/products`), form tambah (`POST
/api/products`), edit, nonaktifkan, kategori (`/api/product-categories`).
3. Form penawaran produk per supplier (`/api/supplier-products` dan
   `/api/supplier-products/[id]/{price,stock}`) — bisa jadi sub-halaman
   dari halaman Produk atau Supplier (ikuti keputusan R25: navigasi utama
   tetap 4 menu).
4. Pengaturan `tax_rates` (`/api/tax-rates`, khusus Pemilik/Admin).

Ikuti pola komponen yang sudah ada di `src/components/ui/**` (Button,
Input, Select, Card, Label, PageHeader, EmptyState) dan pola halaman di
`src/app/(dashboard)/bandingkan/page.tsx` + `src/components/perbandingan/**`
sebagai referensi form client component yang fetch ke API sendiri.

**Environment sudah siap** (tidak perlu setup ulang):

- `.env` sudah berisi `DATABASE_URL` ke Supabase (bukan `prisma dev` lokal
  lagi — itu sempat sangat tidak stabil, jangan kembali ke situ).
- Database sudah dimigrasikan (`npx prisma migrate deploy` sudah
  dijalankan) dan sudah diisi data contoh (`npm run db:seed`): bisnis
  "Toko Contoh Sejahtera", akun `pemilik@contoh.test` /
  `ContohSandi123`, 3 supplier, 2 produk, beberapa penawaran (lihat
  `prisma/seed.ts` untuk detail).
- Halaman `/bandingkan` sudah bisa dicoba end-to-end dengan data seed itu.

**Validasi wajib sebelum menganggap pekerjaan selesai:** `npm run format`,
`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` —
semua harus lulus. Update juga checklist di `docs/IMPLEMENTATION_PLAN.md`
Tahap 3 dan `docs/TRACEABILITY.md` (baris R01, R02, R03, R07, R08) begitu
selesai.

---

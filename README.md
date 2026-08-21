# Sistem Supplier & Perbandingan Harga

Progressive Web App untuk mengelola supplier, membandingkan harga
pembelian, menghitung pajak/ongkir, membuat pesanan, menerima barang, dan
menilai kinerja supplier berdasarkan transaksi nyata.

> **Status implementasi:** Tahap 1 (Fondasi) — lihat
> [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) untuk
> checklist lengkap dan tahap berikutnya. Dokumen perencanaan lain:
> [`docs/SPEC.md`](docs/SPEC.md),
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
> [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md),
> [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md).

## Stack Teknologi

- Next.js 16 (App Router) + TypeScript strict
- Tailwind CSS v4
- PostgreSQL + Prisma 7 (driver adapter `@prisma/adapter-pg`)
- NextAuth v4 (Credentials Provider, sesi JWT)
- Vitest + Testing Library (unit/komponen)
- PWA: manifest + service worker dasar

## Prasyarat

- Node.js 20+ (direkomendasikan versi LTS terbaru)
- npm
- PostgreSQL (lokal, cloud, atau Prisma Postgres lokal — lihat di bawah)

## 1. Instalasi

```bash
npm install
```

## 2. Konfigurasi Environment

Salin `.env.example` menjadi `.env`, lalu isi nilainya:

```bash
cp .env.example .env
```

Isi minimal yang dibutuhkan di `.env`:

| Variabel       | Keterangan                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Koneksi PostgreSQL (lihat opsi database lokal di bawah)                                                                          |
| `AUTH_SECRET`  | Nilai acak untuk menandatangani sesi. Buat dengan: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXTAUTH_URL` | URL dasar aplikasi, contoh `http://localhost:3000`                                                                               |

**Tidak pernah** mengisi nilai asli/rahasia di `.env.example`. Berkas
`.env` sudah ada di `.gitignore` sehingga tidak akan ter-commit.

### Opsi database lokal tanpa instalasi PostgreSQL manual

Proyek ini memakai Prisma 7. Jika Anda belum punya PostgreSQL terpasang,
Prisma menyediakan database lokal siap pakai:

```bash
npx prisma dev --name supplier-app --detach
```

Perintah di atas menampilkan `DATABASE_URL` yang bisa langsung disalin ke
`.env`. Kelola instance ini dengan:

```bash
npx prisma dev ls                 # lihat status
npx prisma dev stop supplier-app  # hentikan
npx prisma dev start supplier-app # jalankan lagi
```

## 3. Migrasi Database

```bash
npx prisma migrate dev   # membuat & menerapkan migrasi (development)
npx prisma generate      # generate Prisma Client (otomatis ikut migrate dev)
```

Untuk lingkungan production/CI:

```bash
npx prisma migrate deploy
```

Untuk memvalidasi skema tanpa mengubah database:

```bash
npx prisma validate
npx prisma migrate status
```

## 4. Data Contoh (Seed)

Mengisi 1 bisnis contoh beserta akun Pemilik/Admin dan Staf:

```bash
npm run db:seed
```

Akun contoh yang dibuat (**hanya untuk pengembangan lokal**, ganti/hapus
sebelum produksi):

| Peran         | Email                 | Kata Sandi       |
| ------------- | --------------------- | ---------------- |
| Pemilik/Admin | `pemilik@contoh.test` | `ContohSandi123` |
| Staf          | `staf@contoh.test`    | `ContohSandi123` |

## 5. Menjalankan Aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000`. Anda akan diarahkan ke halaman `/login`
jika belum masuk (proteksi rute lewat `src/proxy.ts`). Anda juga dapat
mendaftarkan usaha baru dari `/register`.

## Skrip yang Tersedia

| Skrip                       | Fungsi                                      |
| --------------------------- | ------------------------------------------- |
| `npm run dev`               | Menjalankan server pengembangan             |
| `npm run build`             | Production build                            |
| `npm run start`             | Menjalankan hasil production build          |
| `npm run lint`              | ESLint                                      |
| `npm run format`            | Prettier (menulis ulang file)               |
| `npm run format:check`      | Prettier (cek saja, tanpa menulis)          |
| `npm run typecheck`         | Pengecekan tipe TypeScript (`tsc --noEmit`) |
| `npm run test`              | Menjalankan seluruh unit test (Vitest)      |
| `npm run test:watch`        | Vitest mode watch                           |
| `npm run db:generate`       | `prisma generate`                           |
| `npm run db:migrate`        | `prisma migrate dev`                        |
| `npm run db:migrate:deploy` | `prisma migrate deploy` (production/CI)     |
| `npm run db:validate`       | `prisma validate`                           |
| `npm run db:seed`           | Mengisi data contoh                         |

## Validasi yang Sudah Dijalankan pada Tahap 1

Lihat ringkasan hasil di `docs/TRACEABILITY.md` dan `docs/IMPLEMENTATION_PLAN.md`.
Semua perintah berikut telah dijalankan dan lulus terhadap kode Tahap 1:

```bash
npm run format
npm run lint
npm run typecheck
npm run test
npx prisma validate
npx prisma migrate status
npm run build
```

## Struktur Proyek (Tahap 1)

```
src/
  app/
    (auth)/login, (auth)/register        # halaman publik
    (dashboard)/                         # halaman terproteksi + AppShell
      page.tsx                           # Beranda (ringkasan)
      supplier/ produk/ bandingkan/ pesanan/  # empty state, Tahap 3-5
      unauthorized/
    api/auth/[...nextauth]/, api/auth/register/
    layout.tsx, loading.tsx, error.tsx, not-found.tsx
  components/
    app-shell/   # Sidebar, BottomNav, Header, ProfileMenu, NavIcon
    ui/          # Button, Input, Card, EmptyState, StatCard, dll.
    auth/        # LoginForm, RegisterForm
    providers/   # AuthProvider (NextAuth SessionProvider)
    pwa/         # ServiceWorkerRegister
  lib/
    auth/        # auth-options, session, rbac, password
    db/          # prisma client singleton (driver adapter)
    validation/  # skema Zod
    format/      # formatter Rupiah & tanggal Indonesia
    dashboard/   # ringkasan Beranda
  proxy.ts       # proteksi rute (dahulu "middleware.ts")
prisma/
  schema.prisma  # Business, User, BusinessUser (Tahap 1)
  seed.ts
public/
  manifest.webmanifest, sw.js, icons/
docs/            # dokumen perencanaan (SPEC, ARCHITECTURE, dll.)
```

## Catatan Implementasi Penting

- **Autentikasi memakai sesi JWT, bukan sesi database.** NextAuth v4
  mensyaratkan strategi JWT untuk Credentials Provider (sesi database tidak
  didukung untuk provider ini). Untuk menjaga niat "dapat dicabut saat staf
  dinonaktifkan", setiap login memvalidasi ulang status aktif ke database
  dan masa berlaku token dibatasi 12 jam. Detail ada di komentar
  `src/lib/auth/auth-options.ts` dan `docs/ARCHITECTURE.md` §5.
- **Ringkasan Beranda menampilkan nol**, bukan data tiruan — model
  supplier/produk/pesanan/pengingat baru dibangun pada Tahap 3–5. Lihat
  `src/lib/dashboard/summary.ts`.
- **Halaman Supplier/Produk/Bandingkan/Pesanan** hanya menampilkan empty
  state penjelas, tanpa tombol aksi yang belum berfungsi.
- **Ikon PWA** (`public/icons/*.png`) adalah placeholder yang jelas namun
  sementara — ganti dengan aset branding asli sebelum rilis produksi.

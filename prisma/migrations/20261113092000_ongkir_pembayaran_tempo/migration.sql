-- Pembayaran transfer/tempo/DP (perbaikan #4, 2026-11-13).
--
-- CATATAN: migrasi ini dijalankan lewat Supabase SQL Editor (bukan
-- `prisma migrate deploy`), jadi SQL di sini dibuat idempotent sebisanya
-- (IF NOT EXISTS / blok DO) agar aman dijalankan ulang. Menjalankannya
-- lewat SQL Editor TIDAK mencatat `_prisma_migrations` - jangan jalankan
-- `prisma migrate deploy` setelahnya tanpa memeriksa tabel itu dulu.
--
-- Kenapa enum PaymentMethod dibuat ulang, bukan `ALTER TYPE ... ADD
-- VALUE 'TEMPO'`: ADD VALUE tidak boleh jalan di dalam blok transaksi,
-- dan SQL Editor menjalankan satu skrip sebagai satu transaksi implisit.
-- Membuat tipe baru + mengganti tipe kolom + menghapus tipe lama adalah
-- pola yang aman di dalam transaksi (nilai lama TUNAI/TRANSFER tetap
-- dipertahankan lewat USING). Kolom `payment_status`/`paid_amount`/
-- `payment_due_date` baru di `purchase_orders`; baris lama mendapat
-- BELUM_BAYAR / 0 / NULL. Tidak ada perubahan skema ongkir di migrasi
-- ini - tabel `shipping_rules`/`shipping_rule_areas` sudah ada sejak
-- awal dan backend-nya sudah terhubung ke Bandingkan; yang baru di
-- perbaikan #4 adalah UI kelola aturan ongkirnya.

-- Tambah nilai TEMPO ke enum PaymentMethod (via pembuatan ulang tipe)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'PaymentMethod' AND e.enumlabel = 'TEMPO') THEN
    CREATE TYPE "PaymentMethod_new" AS ENUM ('TUNAI', 'TRANSFER', 'TEMPO');
    ALTER TABLE "purchase_orders" ALTER COLUMN "payment_method" TYPE "PaymentMethod_new" USING ("payment_method"::text::"PaymentMethod_new");
    DROP TYPE "PaymentMethod";
    ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('BELUM_BAYAR', 'DP', 'LUNAS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable (purchase_orders): status bayar + jumlah dibayar + jatuh tempo
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "payment_status" "PaymentStatus" NOT NULL DEFAULT 'BELUM_BAYAR';
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "payment_due_date" TIMESTAMP(3);

-- CHECK: jumlah yang sudah dibayar tidak boleh negatif
DO $$ BEGIN
  ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_paid_amount_check" CHECK ("paid_amount" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

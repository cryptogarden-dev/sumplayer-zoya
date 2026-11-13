-- Harga jual per satuan dasar produk (perbaikan #5, 2026-11-13).
--
-- CATATAN: migrasi ini dijalankan lewat Supabase SQL Editor (bukan
-- `prisma migrate deploy`), jadi SQL di sini dibuat idempotent sebisanya
-- (IF NOT EXISTS / blok DO) agar aman dijalankan ulang. Menjalankannya
-- lewat SQL Editor TIDAK mencatat `_prisma_migrations` - jangan jalankan
-- `prisma migrate deploy` setelahnya tanpa memeriksa tabel itu dulu.
--
-- Riwayat harga beli TIDAK butuh perubahan skema: `supplier_prices`
-- sudah append-only (R20) dan harga aktual yang dibayar sudah tersimpan
-- di `purchase_order_items.price_per_package_snapshot`.

-- AlterTable (products): harga jual per satuan dasar (NULL = belum diatur)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sell_price_per_base_unit" DECIMAL(18,2);

-- CHECK: harga jual tidak boleh negatif (NULL tetap diizinkan)
DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_sell_price_per_base_unit_check" CHECK ("sell_price_per_base_unit" IS NULL OR "sell_price_per_base_unit" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

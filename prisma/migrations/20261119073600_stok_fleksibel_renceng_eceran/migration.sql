-- Stok fleksibel: harga jual eceran + riwayat pergerakan stok (2026-11-19).
--
-- CATATAN: migrasi ini dijalankan lewat Supabase SQL Editor (bukan
-- `prisma migrate deploy`), jadi SQL di sini dibuat idempotent sebisanya
-- (`IF NOT EXISTS` / `DO ... EXCEPTION`) agar aman dijalankan ulang.
-- Menjalankannya lewat SQL Editor TIDAK mencatat `_prisma_migrations` -
-- jangan jalankan `prisma migrate deploy` setelahnya tanpa memeriksa
-- tabel itu dulu.
--
-- Yang ditambah:
-- 1. `products.eceran_price_per_base_unit` — harga jual eceran per
--    satuan dasar (mis. per sachet saat jual per pcs). NULL = tidak ada
--    harga eceran; jual per pcs memakai harga jual per satuan dasar.
-- 2. Tabel `stock_movements` — riwayat append-only setiap penjualan
--    (dialog Jual di Stok Toko) dan setiap penyesuaian stok manual
--    (tombol +/- di Stok Toko). Stok produk sendiri tetap di
--    `products.stock_qty`.

-- 1. Harga jual eceran di products.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "eceran_price_per_base_unit" DECIMAL(18,2);

-- 2. Enum jenis pergerakan stok.
DO $$
BEGIN
  CREATE TYPE "StockMovementType" AS ENUM ('PENJUALAN', 'PENYESUAIAN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Tabel riwayat pergerakan stok.
CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "quantity_delta_base" DECIMAL(14,4) NOT NULL,
  "unit_label" TEXT NOT NULL,
  "unit_quantity" DECIMAL(14,4) NOT NULL,
  "unit_price" DECIMAL(18,2),
  "total_amount" DECIMAL(18,2),
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID NOT NULL,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stock_movements_business_id_product_id_created_at_idx"
  ON "stock_movements"("business_id", "product_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "stock_movements_business_id_created_at_idx"
  ON "stock_movements"("business_id", "created_at" DESC);

-- 4. Foreign key (idempotent: tambah hanya bila belum ada).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stock_movements_business_id_fkey'
  ) THEN
    ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stock_movements_product_id_fkey'
  ) THEN
    ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stock_movements_created_by_fkey'
  ) THEN
    ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

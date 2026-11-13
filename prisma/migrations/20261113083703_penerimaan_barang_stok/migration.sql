-- Penerimaan barang + stok toko + kinerja supplier (R18, R15, Tahap 5).
--
-- CATATAN: migrasi ini dijalankan lewat Supabase SQL Editor (bukan
-- `prisma migrate deploy`), jadi SQL di sini dibuat idempotent sebisanya
-- (IF NOT EXISTS / blok DO) agar aman dijalankan ulang. Menjalankannya
-- lewat SQL Editor TIDAK mencatat `_prisma_migrations` - jangan jalankan
-- `prisma migrate deploy` setelahnya tanpa memeriksa tabel itu dulu.
-- Satu pesanan = satu penerimaan barang di v1 (UNIQUE purchase_order_id).

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "GoodsReceiptCompleteness" AS ENUM ('LENGKAP', 'KURANG');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable (products): stok toko + ambang stok menipis
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock_qty" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "low_stock_threshold" DECIMAL(14,4);

-- AlterTable (purchase_orders): tanggal barang diterima
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "received_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "goods_receipts" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "is_partial" BOOLEAN NOT NULL DEFAULT false,
    "overall_completeness" "GoodsReceiptCompleteness" NOT NULL,
    "on_time" BOOLEAN NOT NULL,
    "receipt_photo_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "goods_receipt_items" (
    "id" UUID NOT NULL,
    "goods_receipt_id" UUID NOT NULL,
    "purchase_order_item_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "ordered_qty" DECIMAL(14,4) NOT NULL,
    "received_qty" DECIMAL(14,4) NOT NULL,
    "condition_good_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "condition_damaged_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "price_matches" BOOLEAN NOT NULL,
    "actual_price_per_package" DECIMAL(18,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "goods_receipt_items_ordered_qty_check" CHECK ("ordered_qty" > 0),
    CONSTRAINT "goods_receipt_items_received_qty_check" CHECK ("received_qty" >= 0),
    CONSTRAINT "goods_receipt_items_condition_good_qty_check" CHECK ("condition_good_qty" >= 0),
    CONSTRAINT "goods_receipt_items_condition_damaged_qty_check" CHECK ("condition_damaged_qty" >= 0),
    CONSTRAINT "goods_receipt_items_condition_total_check" CHECK ("condition_good_qty" + "condition_damaged_qty" <= "received_qty"),
    CONSTRAINT "goods_receipt_items_actual_price_check" CHECK ("actual_price_per_package" IS NULL OR "actual_price_per_package" >= 0)
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "supplier_performance" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "completed_orders_count" INTEGER NOT NULL DEFAULT 0,
    "on_time_count" INTEGER NOT NULL DEFAULT 0,
    "on_time_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.5,
    "last_calculated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_performance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "supplier_performance_completed_orders_count_check" CHECK ("completed_orders_count" >= 0),
    CONSTRAINT "supplier_performance_on_time_count_check" CHECK ("on_time_count" >= 0),
    CONSTRAINT "supplier_performance_on_time_le_completed_check" CHECK ("on_time_count" <= "completed_orders_count")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipts_purchase_order_id_key" ON "goods_receipts" ("purchase_order_id");
CREATE INDEX IF NOT EXISTS "goods_receipts_business_id_received_at_idx" ON "goods_receipts" ("business_id", "received_at");
CREATE INDEX IF NOT EXISTS "goods_receipt_items_goods_receipt_id_idx" ON "goods_receipt_items" ("goods_receipt_id");
CREATE INDEX IF NOT EXISTS "goods_receipt_items_purchase_order_item_id_idx" ON "goods_receipt_items" ("purchase_order_item_id");
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_performance_supplier_id_key" ON "supplier_performance" ("supplier_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "supplier_performance" ADD CONSTRAINT "supplier_performance_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "supplier_performance" ADD CONSTRAINT "supplier_performance_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

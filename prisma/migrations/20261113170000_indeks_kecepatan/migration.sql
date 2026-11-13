-- Indeks untuk query panas (perbaikan kecepatan, 2026-11-13).
--
-- CATATAN: migrasi ini dijalankan lewat Supabase SQL Editor (bukan
-- `prisma migrate deploy`), jadi SQL di sini dibuat idempotent sebisanya
-- (`IF NOT EXISTS`) agar aman dijalankan ulang. Menjalankannya lewat SQL
-- Editor TIDAK mencatat `_prisma_migrations` - jangan jalankan
-- `prisma migrate deploy` setelahnya tanpa memeriksa tabel itu dulu.
--
-- Kenapa indeks ini:
-- 1. `purchase_order_items(business_id)` — badge "keranjang" di layout
--    (countDraftOrderItems) jalan di SETIAP halaman dashboard, dan
--    filter-nya `businessId` + status pesanan DRAFT. Sebelumnya tidak ada
--    indeks business_id di tabel ini.
-- 2. `purchase_orders(business_id, created_at DESC)` — daftar Pesanan
--    diurutkan `createdAt` menurun per bisnis.
-- 3. `products(business_id, product_name)` — daftar Produk diurutkan
--    `productName` per bisnis.

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_order_items_business_id_idx" ON "purchase_order_items" ("business_id");
CREATE INDEX IF NOT EXISTS "purchase_orders_business_id_created_at_idx" ON "purchase_orders" ("business_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "products_business_id_product_name_idx" ON "products" ("business_id", "product_name");

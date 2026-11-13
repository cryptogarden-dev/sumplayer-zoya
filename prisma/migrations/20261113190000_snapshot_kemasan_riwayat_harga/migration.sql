-- Snapshot kemasan per entri riwayat harga (perbaikan tampilan riwayat, 2026-11-13).
--
-- CATATAN: migrasi ini dijalankan lewat Supabase SQL Editor (bukan
-- `prisma migrate deploy`), jadi SQL di sini dibuat idempotent sebisanya
-- (`IF NOT EXISTS` / `IS NULL`) agar aman dijalankan ulang. Menjalankannya
-- lewat SQL Editor TIDAK mencatat `_prisma_migrations` - jangan jalankan
-- `prisma migrate deploy` setelahnya tanpa memeriksa tabel itu dulu.
--
-- Masalah yang diperbaiki: tabel riwayat harga (`supplier_prices` dan
-- `purchase_order_items`) tidak menyimpan kemasan yang berlaku saat entri
-- dibuat - tampilan riwayat mengambil kemasan dari definisi penawaran
-- SAAT INI. Akibatnya, setelah 48 penawaran Mayora diubah dari DUS ke
-- PACK (13 Nov 2026), baris riwayat lama ikut tampil sebagai "Pak"
-- dan harga satuannya dihitung pakai isi pack (mis. Rp102.000/10 pcs =
-- Rp10.200/pcs, padahal saat itu Rp850/pcs) plus selisih "turun 91,7%"
-- yang semu. Setelah migrasi ini, tiap baris riwayat menyimpan snapshot
-- kemasannya sendiri dan tidak lagi berubah bila definisi diubah.

-- 1. Kolom snapshot di supplier_prices.
ALTER TABLE "supplier_prices" ADD COLUMN IF NOT EXISTS "package_type_snapshot" "PackagingType";
ALTER TABLE "supplier_prices" ADD COLUMN IF NOT EXISTS "items_per_package_snapshot" DECIMAL(14,4);
ALTER TABLE "supplier_prices" ADD COLUMN IF NOT EXISTS "content_per_item_snapshot" DECIMAL(14,4);
ALTER TABLE "supplier_prices" ADD COLUMN IF NOT EXISTS "content_unit_snapshot" "MeasurementUnit";
ALTER TABLE "supplier_prices" ADD COLUMN IF NOT EXISTS "total_package_content_snapshot" DECIMAL(14,4);
ALTER TABLE "supplier_prices" ADD COLUMN IF NOT EXISTS "base_unit_snapshot" "BaseUnit";

-- 2. Backfill dari definisi penawaran saat ini. Benar untuk semua baris
--    yang definisinya tidak pernah berubah (semua penawaran Beras Tes
--    dan entri harga PACK Mayora yang baru).
UPDATE "supplier_prices" sp SET
  "package_type_snapshot" = sop."package_type",
  "items_per_package_snapshot" = sop."items_per_package",
  "content_per_item_snapshot" = sop."content_per_item",
  "content_unit_snapshot" = sop."content_unit",
  "total_package_content_snapshot" = sop."total_package_content",
  "base_unit_snapshot" = sop."base_unit"
FROM "supplier_products" sop
WHERE sp."supplier_product_id" = sop."id"
  AND sp."package_type_snapshot" IS NULL;

-- 3. Koreksi baris lama Mayora: entri harga pertama tiap penawaran Roby
--    dicatat saat kemasan masih DUS (diubah ke PACK 13 Nov 2026 ~18:37 WIB).
--    Dikenali dari harga per dusnya (berbeda dari harga per pack).
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 12, "content_per_item_snapshot" = 10, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 120, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '8516a98f-8a82-4f8b-9acd-81ce923210f5' AND "price_per_package" = 102000; -- MYR-WAFELLO-1000
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 10, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 60, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '1861f315-2a2d-41c3-b69b-e480fb5bd2ea' AND "price_per_package" = 102000; -- MYR-WAFELLO-2000-COKLAT
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 10, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 60, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '9fe86e73-c01f-46d9-a02b-cc8e778ae362' AND "price_per_package" = 102000; -- MYR-WAFELLO-2000-CARAMEL
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 24, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 24, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'a8fe4b45-0a83-4a7f-acb0-bfc0b18e43aa' AND "price_per_package" = 121200; -- MYR-WAFELLO-5000
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 17, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 136, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '0d813999-fdfd-4d74-9a9c-325121dd375d' AND "price_per_package" = 285600; -- MYR-BENGBENG-REGULER
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 12, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 96, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '0c382a5d-bc01-4e65-bfda-f4badeb1ef1a' AND "price_per_package" = 326400; -- MYR-BENGBENG-MAXX
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 12, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 96, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '3aa6355e-5574-4f39-97fe-f0c4cc7f5fc2' AND "price_per_package" = 158400; -- MYR-SUPERSTAR-SNAPS
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 20, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 160, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'c9eee870-bdb6-4e6e-9fbf-9ebe5b7d2da6' AND "price_per_package" = 136000; -- MYR-SUPERSTAR-TRIPLE
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 12, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 96, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '75414960-6f83-47df-8134-795ea464f30e' AND "price_per_package" = 158400; -- MYR-KALPA
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 20, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 160, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '09b0e157-6d92-41bd-95e4-5aa11573f396' AND "price_per_package" = 132000; -- MYR-ASTOR-SINGLE
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 10, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 60, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'e6b7d24a-ee8e-4743-b8b7-9befbbcfbb26' AND "price_per_package" = 96000; -- MYR-MINI-ASTOR
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 20, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 20, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'a60c1c3e-3e0e-4a5c-9731-1972caf108de' AND "price_per_package" = 245000; -- MYR-ASTOR-DOUBLE-150
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 30, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 30, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '899687a4-d37b-409b-b810-cfd2db3b4ed8' AND "price_per_package" = 163800; -- MYR-ASTOR-40
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 24, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 24, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '4a327d18-4406-45d5-8abf-9d73d91611f1' AND "price_per_package" = 211000; -- MYR-ASTOR-80
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 8, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '49554717-64b5-4527-b710-86b25c4d5a9a' AND "price_per_package" = 160000; -- MYR-ASTOR-200
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 6, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '094ba09b-909e-4213-a6b1-2eb85a0e9a0d' AND "price_per_package" = 174000; -- MYR-ASTOR-330
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 10, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 60, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '63275f8a-47f8-42c8-926f-812c31724b32' AND "price_per_package" = 96000; -- MYR-FRUTAGUMMY-2000
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 13, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 104, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'a90fe659-980e-4ff5-b20b-9be35723c41e' AND "price_per_package" = 72000; -- MYR-FRUTAGUMMY-1000
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 13, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 104, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'cc797cb1-9e21-479d-b5f3-8c6ee5cc11b7' AND "price_per_package" = 72000; -- MYR-FRUTAGUMMY-JUMBO-ORANGE
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 10, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 60, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '23f4621e-5648-4390-a651-094d28ae751b' AND "price_per_package" = 96000; -- MYR-FRUTIVIT-1000
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 16, "content_per_item_snapshot" = 10, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 160, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '432aa9f2-af67-4b4b-9fe6-095b669eab74' AND "price_per_package" = 272000; -- MYR-ROMA-BONITA-CREAM
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 24, "content_per_item_snapshot" = 10, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 240, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '586b7cf0-9075-4f97-8d6e-93a545ab1859' AND "price_per_package" = 204000; -- MYR-BORI-BORI
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 24, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 24, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '5724ac2b-1015-40e8-b0f9-5312f403b863' AND "price_per_package" = 222000; -- MYR-KOPIKO-COFFEE
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 24, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 24, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '98bc1b81-5d85-4672-b6ab-1c0e8fc15784' AND "price_per_package" = 222000; -- MYR-KOPIKO-CAPPUCCINO
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 12, "content_per_item_snapshot" = 20, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 240, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '8450b160-444f-4135-8970-26e7c7efcf32' AND "price_per_package" = 180000; -- MYR-KOPIKO-STICK
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 12, "content_per_item_snapshot" = 12, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 144, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '06c0ef4e-88aa-4dda-a794-a4fa525a2c4c' AND "price_per_package" = 237600; -- MYR-KOPIKO-BLISTER
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 6, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '74f2eb37-cdad-427e-96a3-2ad647de6da8' AND "price_per_package" = 194250; -- MYR-KOPIKO-JAR
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 24, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 24, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '4521bc54-1998-4fad-b03e-9e391cc4ad52' AND "price_per_package" = 150000; -- MYR-KIS-ZAK-GT
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 6, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'aa3f273f-4145-495c-885d-63badb4071be' AND "price_per_package" = 150000; -- MYR-KIS-JAR
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 24, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 24, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'c0135a7f-27b7-4f9b-bb39-e3d2b33f8d20' AND "price_per_package" = 150000; -- MYR-TAMARIN-ZAK
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 6, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '5e56bd2d-a1ce-4f19-a298-00abbfb605bf' AND "price_per_package" = 150000; -- MYR-TAMARIN-JAR
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 24, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 24, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '32f5026e-1421-40ee-ab47-5fddfc77a412' AND "price_per_package" = 294000; -- MYR-KOPIKO-SUGAR-FREE
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 9, "content_per_item_snapshot" = 20, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 180, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'b93f75d3-5af4-45b5-aaf0-7afe4975023a' AND "price_per_package" = 153000; -- MYR-CHOKI-CASHEW
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 12, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 72, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '86bc6634-ee6c-42b3-b12b-99115ef41874' AND "price_per_package" = 118800; -- MYR-CHOKI-STIX
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 15, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 120, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '8d1566f4-05b6-4214-8921-764497d12a28' AND "price_per_package" = 744000; -- MYR-BENGBENG-NUTS
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 26, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 208, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '782b424d-942c-4b47-9058-67f298a7d455' AND "price_per_package" = 165000; -- MYR-KALPA-HEXA-1000
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 16, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 16, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'c215d8ad-bd06-4bbc-8449-934e0f41d657' AND "price_per_package" = 184000; -- MYR-BB-SHAREIT-REG
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 6, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '86f2e750-d414-42f9-b8e7-32624b4b7e64' AND "price_per_package" = 165000; -- MYR-BB-SHAREIT-FESTIVE
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 16, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 16, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'e8527fe9-063b-4a85-baf1-64640ac0dac7' AND "price_per_package" = 160000; -- MYR-KALPA-SHAREIT-REG
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 8, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = 'dbf080d7-4ee8-40a7-98cd-6825b9924da6' AND "price_per_package" = 160000; -- MYR-KALPA-SHAREIT-FESTIVE
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 8, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '1bbb3656-62ea-4df5-af48-fbf6c7beb950' AND "price_per_package" = 170000; -- MYR-KALPA-JAR
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 6, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '8998889b-6fbb-4b78-a402-ece068a18f58' AND "price_per_package" = 165000; -- MYR-WAFELLO-KALENG
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 16, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 16, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '8f75b4b6-3232-4a27-a46e-7028e2ae8b08' AND "price_per_package" = 125600; -- MYR-WAFELLO-POUCH
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 8, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 8, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '504b3dd6-c9f5-4f1a-890c-50f145c09121' AND "price_per_package" = 102000; -- MYR-WAFELLO-POUCH-FESTIVE
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 6, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 6, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '5e0b1488-716f-432f-a46b-fa4980927167' AND "price_per_package" = 370800; -- MYR-CHOKI-ROCKETZ
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 12, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 12, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '6e8e8637-464d-4948-8e86-0d3b6f7f2a24' AND "price_per_package" = 222000; -- MYR-KIS-FESTIVE
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 12, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 12, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '60e61f4d-cf73-4630-ad9d-1ce43c5545c5' AND "price_per_package" = 222000; -- MYR-TAMARIN-FESTIVE
UPDATE "supplier_prices" SET "package_type_snapshot" = 'DUS', "items_per_package_snapshot" = 12, "content_per_item_snapshot" = 1, "content_unit_snapshot" = 'PCS', "total_package_content_snapshot" = 12, "base_unit_snapshot" = 'PCS' WHERE "supplier_product_id" = '59b8e54c-d0e3-4fba-a379-e990bcfa0524' AND "price_per_package" = 222000; -- MYR-KOPIKO-FESTIVE

-- 4. Kolom snapshot di purchase_order_items (baris PEMBELIAN di riwayat).
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "package_type_snapshot" "PackagingType";
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "items_per_package_snapshot" DECIMAL(14,4);
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "content_per_item_snapshot" DECIMAL(14,4);
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "content_unit_snapshot" "MeasurementUnit";
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "total_package_content_snapshot" DECIMAL(14,4);
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "base_unit_snapshot" "BaseUnit";

-- 5. Backfill purchase_order_items dari definisi saat ini (tidak ada
--    pesanan Mayora; pesanan Beras Tes definisinya tidak pernah berubah).
UPDATE "purchase_order_items" poi SET
  "package_type_snapshot" = sop."package_type",
  "items_per_package_snapshot" = sop."items_per_package",
  "content_per_item_snapshot" = sop."content_per_item",
  "content_unit_snapshot" = sop."content_unit",
  "total_package_content_snapshot" = sop."total_package_content",
  "base_unit_snapshot" = sop."base_unit"
FROM "supplier_products" sop
WHERE poi."supplier_product_id" = sop."id"
  AND poi."package_type_snapshot" IS NULL;

-- 6. Kunci NOT NULL setelah backfill (semua baris sudah terisi).
ALTER TABLE "supplier_prices" ALTER COLUMN "package_type_snapshot" SET NOT NULL;
ALTER TABLE "supplier_prices" ALTER COLUMN "items_per_package_snapshot" SET NOT NULL;
ALTER TABLE "supplier_prices" ALTER COLUMN "content_per_item_snapshot" SET NOT NULL;
ALTER TABLE "supplier_prices" ALTER COLUMN "content_unit_snapshot" SET NOT NULL;
ALTER TABLE "supplier_prices" ALTER COLUMN "total_package_content_snapshot" SET NOT NULL;
ALTER TABLE "supplier_prices" ALTER COLUMN "base_unit_snapshot" SET NOT NULL;
ALTER TABLE "purchase_order_items" ALTER COLUMN "package_type_snapshot" SET NOT NULL;
ALTER TABLE "purchase_order_items" ALTER COLUMN "items_per_package_snapshot" SET NOT NULL;
ALTER TABLE "purchase_order_items" ALTER COLUMN "content_per_item_snapshot" SET NOT NULL;
ALTER TABLE "purchase_order_items" ALTER COLUMN "content_unit_snapshot" SET NOT NULL;
ALTER TABLE "purchase_order_items" ALTER COLUMN "total_package_content_snapshot" SET NOT NULL;
ALTER TABLE "purchase_order_items" ALTER COLUMN "base_unit_snapshot" SET NOT NULL;


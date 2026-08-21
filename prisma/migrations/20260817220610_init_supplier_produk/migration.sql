-- CreateEnum
CREATE TYPE "BusinessUserRole" AS ENUM ('owner_admin', 'staff');

-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'PCS', 'LUSIN');

-- CreateEnum
CREATE TYPE "UnitFamily" AS ENUM ('WEIGHT', 'VOLUME', 'COUNT');

-- CreateEnum
CREATE TYPE "BaseUnit" AS ENUM ('KILOGRAM', 'LITER', 'PCS');

-- CreateEnum
CREATE TYPE "PackagingType" AS ENUM ('DUS', 'PAK', 'KARUNG', 'BOTOL', 'KALENG', 'SAK', 'BAL', 'TRAY', 'BOX');

-- CreateEnum
CREATE TYPE "TaxStatus" AS ENUM ('INCLUDED', 'EXCLUDED', 'NONE');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('TERSEDIA', 'STOK_TERBATAS', 'KOSONG', 'PRE_ORDER', 'PERLU_KONFIRMASI');

-- CreateEnum
CREATE TYPE "ShippingMode" AS ENUM ('GRATIS_TANPA_SYARAT', 'GRATIS_MIN_PEMBELIAN', 'TETAP', 'BERDASARKAN_AREA', 'PICKUP', 'PERLU_KONFIRMASI');

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "default_address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "stale_data_threshold_days" INTEGER NOT NULL DEFAULT 7,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_users" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "BusinessUserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "product_name" TEXT NOT NULL,
    "brand" TEXT,
    "variant" TEXT,
    "category_id" UUID,
    "photo_url" TEXT,
    "unit_family" "UnitFamily" NOT NULL,
    "base_unit" "BaseUnit" NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "company_name" TEXT,
    "contact_name" TEXT,
    "phone_number" TEXT,
    "whatsapp_number" TEXT,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "postal_code" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "map_location" TEXT,
    "operating_hours" TEXT,
    "lead_time_days_min" INTEGER NOT NULL DEFAULT 0,
    "lead_time_days_max" INTEGER NOT NULL,
    "order_cutoff_time" TEXT,
    "order_cutoff_days" TEXT[],
    "min_purchase_amount" DECIMAL(18,2),
    "payment_method" TEXT,
    "payment_term_days" INTEGER,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_contacts" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "contact_name" TEXT NOT NULL,
    "role_title" TEXT,
    "phone_number" TEXT,
    "whatsapp_number" TEXT,
    "email" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_delivery_areas" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT,
    "district" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_delivery_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_delivery_schedules" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_delivery_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate_percent" DECIMAL(6,3) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_products" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "supplier_sku_or_name" TEXT,
    "package_type" "PackagingType" NOT NULL,
    "items_per_package" DECIMAL(14,4) NOT NULL,
    "content_per_item" DECIMAL(14,4) NOT NULL,
    "content_unit" "MeasurementUnit" NOT NULL,
    "total_package_content" DECIMAL(14,4) NOT NULL,
    "base_unit" "BaseUnit" NOT NULL,
    "min_purchase_packages" DECIMAL(14,4) NOT NULL DEFAULT 1,
    "purchase_multiple_packages" DECIMAL(14,4) NOT NULL DEFAULT 1,
    "estimated_delivery_days_min" INTEGER,
    "estimated_delivery_days_max" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_prices" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "supplier_product_id" UUID NOT NULL,
    "price_per_package" DECIMAL(18,2) NOT NULL,
    "tax_status" "TaxStatus" NOT NULL,
    "tax_rate_id" UUID,
    "tax_rate_value_snapshot" DECIMAL(6,3),
    "price_source_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "supplier_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_stock" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "supplier_product_id" UUID NOT NULL,
    "availability_status" "AvailabilityStatus" NOT NULL,
    "stock_qty" DECIMAL(14,4),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "supplier_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rules" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "rule_type" "ShippingMode" NOT NULL,
    "free_shipping_min_amount" DECIMAL(18,2),
    "flat_fee" DECIMAL(18,2),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "shipping_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rule_areas" (
    "id" UUID NOT NULL,
    "shipping_rule_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT,
    "fee" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_rule_areas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "business_users_user_id_idx" ON "business_users"("user_id");

-- CreateIndex
CREATE INDEX "business_users_business_id_idx" ON "business_users"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_users_business_id_user_id_key" ON "business_users"("business_id", "user_id");

-- CreateIndex
CREATE INDEX "product_categories_business_id_idx" ON "product_categories"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_business_id_name_key" ON "product_categories"("business_id", "name");

-- CreateIndex
CREATE INDEX "products_business_id_idx" ON "products"("business_id");

-- CreateIndex
CREATE INDEX "products_business_id_is_active_idx" ON "products"("business_id", "is_active");

-- CreateIndex
CREATE INDEX "products_business_id_barcode_idx" ON "products"("business_id", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "products_business_id_sku_key" ON "products"("business_id", "sku");

-- CreateIndex
CREATE INDEX "suppliers_business_id_idx" ON "suppliers"("business_id");

-- CreateIndex
CREATE INDEX "suppliers_business_id_is_active_idx" ON "suppliers"("business_id", "is_active");

-- CreateIndex
CREATE INDEX "suppliers_business_id_city_idx" ON "suppliers"("business_id", "city");

-- CreateIndex
CREATE INDEX "supplier_contacts_supplier_id_idx" ON "supplier_contacts"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_delivery_areas_supplier_id_idx" ON "supplier_delivery_areas"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_delivery_areas_business_id_province_city_idx" ON "supplier_delivery_areas"("business_id", "province", "city");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_delivery_schedules_supplier_id_day_of_week_key" ON "supplier_delivery_schedules"("supplier_id", "day_of_week");

-- CreateIndex
CREATE INDEX "tax_rates_business_id_is_active_idx" ON "tax_rates"("business_id", "is_active");

-- CreateIndex
CREATE INDEX "supplier_products_business_id_idx" ON "supplier_products"("business_id");

-- CreateIndex
CREATE INDEX "supplier_products_product_id_idx" ON "supplier_products"("product_id");

-- CreateIndex
CREATE INDEX "supplier_products_supplier_id_idx" ON "supplier_products"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_products_business_id_product_id_is_active_idx" ON "supplier_products"("business_id", "product_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_supplier_id_product_id_package_type_suppl_key" ON "supplier_products"("supplier_id", "product_id", "package_type", "supplier_sku_or_name");

-- CreateIndex
CREATE INDEX "supplier_prices_supplier_product_id_created_at_idx" ON "supplier_prices"("supplier_product_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_stock_supplier_product_id_key" ON "supplier_stock"("supplier_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_rules_supplier_id_key" ON "shipping_rules"("supplier_id");

-- CreateIndex
CREATE INDEX "shipping_rule_areas_shipping_rule_id_idx" ON "shipping_rule_areas"("shipping_rule_id");

-- AddForeignKey
ALTER TABLE "business_users" ADD CONSTRAINT "business_users_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_users" ADD CONSTRAINT "business_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_delivery_areas" ADD CONSTRAINT "supplier_delivery_areas_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_delivery_areas" ADD CONSTRAINT "supplier_delivery_areas_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_delivery_schedules" ADD CONSTRAINT "supplier_delivery_schedules_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_delivery_schedules" ADD CONSTRAINT "supplier_delivery_schedules_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_supplier_product_id_fkey" FOREIGN KEY ("supplier_product_id") REFERENCES "supplier_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_stock" ADD CONSTRAINT "supplier_stock_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_stock" ADD CONSTRAINT "supplier_stock_supplier_product_id_fkey" FOREIGN KEY ("supplier_product_id") REFERENCES "supplier_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_stock" ADD CONSTRAINT "supplier_stock_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rules" ADD CONSTRAINT "shipping_rules_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rules" ADD CONSTRAINT "shipping_rules_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rules" ADD CONSTRAINT "shipping_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rule_areas" ADD CONSTRAINT "shipping_rule_areas_shipping_rule_id_fkey" FOREIGN KEY ("shipping_rule_id") REFERENCES "shipping_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rule_areas" ADD CONSTRAINT "shipping_rule_areas_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint (pertahanan berlapis DB-level untuk R27/R29 - validasi
-- utama tetap dilakukan di Zod/service layer, ini adalah jaring pengaman
-- kedua terhadap penulisan data langsung yang melewati aplikasi).
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_stale_threshold_check" CHECK ("stale_data_threshold_days" > 0);

ALTER TABLE "products" ADD CONSTRAINT "products_unit_family_base_unit_check" CHECK (
  ("unit_family" = 'WEIGHT' AND "base_unit" = 'KILOGRAM') OR
  ("unit_family" = 'VOLUME' AND "base_unit" = 'LITER') OR
  ("unit_family" = 'COUNT' AND "base_unit" = 'PCS')
);

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_lead_time_check" CHECK ("lead_time_days_min" >= 0 AND "lead_time_days_max" >= "lead_time_days_min");
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_min_purchase_amount_check" CHECK ("min_purchase_amount" IS NULL OR "min_purchase_amount" >= 0);
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_payment_term_days_check" CHECK ("payment_term_days" IS NULL OR "payment_term_days" >= 0);
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_contact_required_check" CHECK ("phone_number" IS NOT NULL OR "whatsapp_number" IS NOT NULL);

ALTER TABLE "supplier_delivery_schedules" ADD CONSTRAINT "supplier_delivery_schedules_day_of_week_check" CHECK ("day_of_week" BETWEEN 0 AND 6);

ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_rate_percent_check" CHECK ("rate_percent" >= 0);

ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_items_per_package_check" CHECK ("items_per_package" > 0);
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_content_per_item_check" CHECK ("content_per_item" > 0);
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_total_package_content_check" CHECK ("total_package_content" > 0);
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_min_purchase_packages_check" CHECK ("min_purchase_packages" > 0);
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_purchase_multiple_packages_check" CHECK ("purchase_multiple_packages" > 0);
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_delivery_days_check" CHECK ("estimated_delivery_days_min" IS NULL OR "estimated_delivery_days_max" IS NULL OR "estimated_delivery_days_max" >= "estimated_delivery_days_min");

ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_price_per_package_check" CHECK ("price_per_package" >= 0);
ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_tax_rate_value_snapshot_check" CHECK ("tax_rate_value_snapshot" IS NULL OR "tax_rate_value_snapshot" >= 0);
ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_tax_rate_none_check" CHECK ("tax_status" != 'NONE' OR "tax_rate_id" IS NULL);

ALTER TABLE "supplier_stock" ADD CONSTRAINT "supplier_stock_stock_qty_check" CHECK ("stock_qty" IS NULL OR "stock_qty" >= 0);

ALTER TABLE "shipping_rules" ADD CONSTRAINT "shipping_rules_free_shipping_min_amount_check" CHECK ("free_shipping_min_amount" IS NULL OR "free_shipping_min_amount" >= 0);
ALTER TABLE "shipping_rules" ADD CONSTRAINT "shipping_rules_flat_fee_check" CHECK ("flat_fee" IS NULL OR "flat_fee" >= 0);

ALTER TABLE "shipping_rule_areas" ADD CONSTRAINT "shipping_rule_areas_fee_check" CHECK ("fee" >= 0);

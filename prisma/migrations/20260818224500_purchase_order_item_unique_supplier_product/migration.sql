-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_items_purchase_order_id_supplier_product_id_key" ON "purchase_order_items"("purchase_order_id", "supplier_product_id");

"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard, type ProductCardData } from "@/components/produk/ProductCard";
import { ProductQuickOrderSheet } from "@/components/produk/ProductQuickOrderSheet";

export interface ProductBrowserCategory {
  id: string;
  name: string;
  productCount: number;
}

export interface ProductBrowserSupplier {
  id: string;
  supplierName: string;
}

const ALL_CATEGORIES = "__all__";
const ALL_SUPPLIERS = "";

/**
 * Etalase produk bergaya marketplace (pengganti daftar polos): cari,
 * filter kategori (chip), dan filter supplier - semuanya di sisi klien
 * karena data produk satu bisnis berskala kecil-menengah (cukup untuk
 * beban UKM, konsisten dengan ARCHITECTURE.md §1).
 */
export function ProductBrowser({
  products,
  categories,
  suppliers,
}: {
  products: ProductCardData[];
  categories: ProductBrowserCategory[];
  suppliers: ProductBrowserSupplier[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);
  const [supplierId, setSupplierId] = useState<string>(ALL_SUPPLIERS);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryId !== ALL_CATEGORIES && product.category?.id !== categoryId) return false;
      if (supplierId !== ALL_SUPPLIERS && !product.supplierIds.includes(supplierId)) return false;
      if (q) {
        const haystack = [product.productName, product.sku, product.brand]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [products, query, categoryId, supplierId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Cari nama produk, SKU, atau merek..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="sm:max-w-sm"
        />
        {suppliers.length > 0 ? (
          <Select
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            className="sm:max-w-64"
            aria-label="Filter berdasarkan supplier"
          >
            <option value={ALL_SUPPLIERS}>Semua Supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.supplierName}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {categories.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip
            active={categoryId === ALL_CATEGORIES}
            onClick={() => setCategoryId(ALL_CATEGORIES)}
          >
            Semua ({products.length})
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category.id}
              active={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name} ({category.productCount})
            </Chip>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada produk yang cocok"
          description="Coba ubah kata kunci pencarian atau longgarkan filter kategori/supplier."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} onSelect={setSelectedProductId} />
          ))}
        </div>
      )}

      <ProductQuickOrderSheet
        product={selectedProduct}
        onClose={() => setSelectedProductId(null)}
      />
    </div>
  );
}

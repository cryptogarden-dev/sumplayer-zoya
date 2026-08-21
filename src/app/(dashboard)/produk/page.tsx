import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import {
  listProductCategoriesWithCounts,
  listProducts,
} from "@/lib/server/repositories/product-repository";
import { listSuppliers } from "@/lib/server/repositories/supplier-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductBrowser } from "@/components/produk/ProductBrowser";

export const metadata: Metadata = { title: "Produk" };
export const dynamic = "force-dynamic";

/**
 * Etalase produk bergaya marketplace (Tahap 3, diperluas atas permintaan
 * pengguna 2026-08-20): pencarian, filter kategori, dan filter supplier -
 * lihat `src/components/produk/ProductBrowser.tsx` untuk logika filter.
 */
export default async function ProdukPage() {
  const session = await requireSession();
  // `includeInactive: true` (docs/BACKLOG.md #5): produk yang dinonaktifkan
  // tetap tampil di sini (dengan badge "Nonaktif" dari `ProductCard`) supaya
  // pengguna tahu produk itu masih ada dan bisa diaktifkan lagi kapan saja,
  // alih-alih menghilang begitu saja dari daftar.
  const [products, categories, suppliers] = await Promise.all([
    listProducts(session.user.businessId, { includeInactive: true }),
    listProductCategoriesWithCounts(session.user.businessId),
    listSuppliers(session.user.businessId),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Produk"
          description="Kelola master produk dan penawaran harga dari setiap supplier."
        />
        <Link
          href="/produk/baru"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Tambah Produk
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="Belum ada produk"
          description='Belum ada data produk untuk bisnis ini. Klik "Tambah Produk" untuk menambahkan produk baru.'
        />
      ) : (
        <ProductBrowser
          products={products.map((product) => {
            const prices = product.supplierProducts
              .map((offer) => offer.prices[0]?.pricePerPackage)
              .filter((price): price is NonNullable<typeof price> => price != null)
              .map((price) => Number(price));
            const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;

            return {
              id: product.id,
              sku: product.sku,
              productName: product.productName,
              brand: product.brand,
              variant: product.variant,
              unitFamily: product.unitFamily,
              photoUrl: product.photoUrl,
              isActive: product.isActive,
              offerCount: product._count.supplierProducts,
              lowestPrice,
              supplierIds: product.supplierProducts.map((offer) => offer.supplierId),
              category: product.category
                ? { id: product.category.id, name: product.category.name }
                : null,
            };
          })}
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            productCount: category._count.products,
          }))}
          suppliers={suppliers.map((supplier) => ({
            id: supplier.id,
            supplierName: supplier.supplierName,
          }))}
        />
      )}
    </div>
  );
}

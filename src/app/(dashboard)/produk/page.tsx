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
import { computeCheapestBuyPricePerBaseUnit, computeMargin } from "@/lib/domain/pricing/margin";

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
          className="bg-slate hover:bg-slate/90 focus-visible:outline-slate inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
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
            // Harga beli termurah per satuan dasar + margin vs harga jual
            // (perbaikan #5) — dihitung dari penawaran aktif yang sama.
            // Modal di kartu tampil per satuan dasar (bukan per kemasan)
            // supaya sejajar dengan harga jual dan marginnya.
            const cheapestBuy = computeCheapestBuyPricePerBaseUnit(
              product.supplierProducts
                .filter((offer) => offer.prices[0])
                .map((offer) => ({
                  pricePerPackage: offer.prices[0]!.pricePerPackage,
                  taxStatus: offer.prices[0]!.taxStatus,
                  taxRatePercent: offer.prices[0]!.taxRateValueSnapshot ?? 0,
                  totalPackageContent: offer.totalPackageContent,
                  supplierName: "",
                })),
            );
            const margin = computeMargin({
              sellPricePerBaseUnit: product.sellPricePerBaseUnit,
              buyPricePerBaseUnit: cheapestBuy?.pricePerBaseUnit,
            });

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
              supplierIds: product.supplierProducts.map((offer) => offer.supplierId),
              stockQty: product.stockQty.toString(),
              lowStockThreshold: product.lowStockThreshold?.toString() ?? null,
              baseUnit: product.baseUnit,
              sellPricePerBaseUnit: product.sellPricePerBaseUnit?.toString() ?? null,
              cheapestBuyPerBaseUnit: cheapestBuy?.pricePerBaseUnit.toNumber() ?? null,
              marginPercent: margin?.percent?.toNumber() ?? null,
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

import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import {
  getProductById,
  listProductCategories,
} from "@/lib/server/repositories/product-repository";
import { listSuppliers } from "@/lib/server/repositories/supplier-repository";
import { listTaxRates } from "@/lib/server/repositories/tax-rate-repository";
import { listOffers } from "@/lib/server/repositories/supplier-product-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { BackLink } from "@/components/ui/BackLink";
import { ProductEditForm } from "@/components/produk/ProductEditForm";
import { ProductStatusButton } from "@/components/produk/ProductStatusButton";
import { ProductDeleteButton } from "@/components/produk/ProductDeleteButton";
import { OfferActions } from "@/components/produk/OfferActions";
import { OfferForm } from "@/components/produk/OfferForm";
import { formatRupiah } from "@/lib/format/currency";
import {
  AVAILABILITY_STATUS_LABELS,
  BASE_UNIT_LABELS,
  MEASUREMENT_UNIT_LABELS,
  PACKAGING_TYPE_LABELS,
  TAX_STATUS_LABELS,
} from "@/lib/format/units";

export const metadata: Metadata = { title: "Detail Produk" };
export const dynamic = "force-dynamic";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const session = await requireSession();
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(session.user.businessId, id),
    listProductCategories(session.user.businessId),
  ]);

  if (!product) {
    return (
      <div>
        <BackLink href="/produk" label="Kembali ke Produk" />
        <PageHeader title="Detail Produk" />
        <EmptyState
          title="Produk tidak ditemukan"
          description="Data mungkin sudah dihapus atau bukan milik bisnis ini."
        />
      </div>
    );
  }

  const [suppliers, taxRates, offers] = await Promise.all([
    listSuppliers(session.user.businessId),
    listTaxRates(session.user.businessId),
    listOffers(session.user.businessId, { productId: product.id, includeInactive: true }),
  ]);

  return (
    <div>
      <BackLink href="/produk" label="Kembali ke Produk" />
      <PageHeader title={product.productName} description="Ubah data produk atau nonaktifkan." />

      <div className="space-y-6">
        <ProductEditForm
          product={{
            id: product.id,
            sku: product.sku,
            barcode: product.barcode,
            productName: product.productName,
            brand: product.brand,
            variant: product.variant,
            categoryId: product.categoryId,
            photoUrl: product.photoUrl,
            unitFamily: product.unitFamily,
            notes: product.notes,
          }}
          categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        />

        <div className="flex flex-wrap items-center gap-3">
          <ProductStatusButton productId={product.id} isActive={product.isActive} />
          <ProductDeleteButton productId={product.id} />
        </div>
        <p className="-mt-4 text-xs text-slate-500">
          Nonaktifkan bisa diaktifkan lagi sewaktu-waktu. Hapus permanen hanya bisa dilakukan untuk
          produk yang belum pernah dipesan ke supplier manapun.
        </p>

        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            Penawaran dari Supplier ({offers.length})
          </h2>
          {offers.length === 0 ? (
            <EmptyState
              title="Belum ada penawaran"
              description="Belum ada supplier yang menawarkan produk ini. Tambahkan lewat form di bawah."
            />
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => {
                const price = offer.prices[0];
                return (
                  <Card key={offer.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {offer.supplier.supplierName}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {PACKAGING_TYPE_LABELS[offer.packageType]} ·{" "}
                          {Number(offer.itemsPerPackage)} x {Number(offer.contentPerItem)}{" "}
                          {MEASUREMENT_UNIT_LABELS[offer.contentUnit]} ={" "}
                          {Number(offer.totalPackageContent)} {BASE_UNIT_LABELS[offer.baseUnit]}
                        </p>
                        {price ? (
                          <p className="mt-1 text-sm text-slate-600">
                            {formatRupiah(Number(price.pricePerPackage))} ·{" "}
                            {TAX_STATUS_LABELS[price.taxStatus]}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p>
                          {offer.stock
                            ? AVAILABILITY_STATUS_LABELS[offer.stock.availabilityStatus]
                            : "Belum ada info stok"}
                        </p>
                        <p className={offer.isActive ? "text-emerald-600" : "text-slate-400"}>
                          {offer.isActive ? "Aktif" : "Nonaktif"}
                        </p>
                      </div>
                    </div>
                    <OfferActions offerId={offer.id} isActive={offer.isActive} />
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Tambah Penawaran</h2>
          <OfferForm
            productId={product.id}
            unitFamily={product.unitFamily}
            suppliers={suppliers.map((supplier) => ({
              id: supplier.id,
              supplierName: supplier.supplierName,
            }))}
            taxRates={taxRates.map((rate) => ({
              id: rate.id,
              name: rate.name,
              ratePercent: rate.ratePercent.toString(),
            }))}
          />
        </div>
      </div>
    </div>
  );
}

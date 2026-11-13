import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import {
  getProductById,
  listProductCategories,
} from "@/lib/server/repositories/product-repository";
import { listSuppliers } from "@/lib/server/repositories/supplier-repository";
import { listTaxRates } from "@/lib/server/repositories/tax-rate-repository";
import { listOffers } from "@/lib/server/repositories/supplier-product-repository";
import { listPurchasePriceHistory } from "@/lib/server/repositories/price-history-repository";
import { computeCheapestBuyPricePerBaseUnit, computeMargin } from "@/lib/domain/pricing/margin";
import { calculateSubtotal } from "@/lib/domain/pricing/subtotal";
import { calculatePricePerBaseUnit } from "@/lib/domain/pricing/unit-price";
import { SellRecommendation } from "@/components/produk/SellRecommendation";
import { PriceHistoryTable } from "@/components/produk/PriceHistoryTable";
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
  // Keenam query di bawah hanya butuh businessId + id dari URL — tidak
  // ada yang bergantung pada hasil query lain — jadi dijalankan dalam
  // SATU Promise.all (perbaikan kecepatan 2026-11-13). Sebelumnya ada
  // dua ronde berurutan (produk+kategori, lalu supplier+pajak+penawaran
  // +riwayat), padahal ronde kedua tidak memakai hasil ronde pertama.
  const [product, categories, suppliers, taxRates, offers, priceHistory] = await Promise.all([
    getProductById(session.user.businessId, id),
    listProductCategories(session.user.businessId),
    listSuppliers(session.user.businessId),
    listTaxRates(session.user.businessId),
    listOffers(session.user.businessId, { productId: id, includeInactive: true }),
    listPurchasePriceHistory(session.user.businessId, id),
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

  // Harga beli termurah per satuan dasar (setelah pajak) dari penawaran
  // aktif — dipakai untuk margin. Bila tidak ada, margin tidak tampil.
  const cheapestBuy = computeCheapestBuyPricePerBaseUnit(
    offers
      .filter((offer) => offer.isActive && offer.prices[0])
      .map((offer) => ({
        pricePerPackage: offer.prices[0]!.pricePerPackage,
        taxStatus: offer.prices[0]!.taxStatus,
        taxRatePercent: offer.prices[0]!.taxRateValueSnapshot ?? 0,
        totalPackageContent: offer.totalPackageContent,
        supplierName: offer.supplier.supplierName,
      })),
  );
  const margin = computeMargin({
    sellPricePerBaseUnit: product.sellPricePerBaseUnit,
    buyPricePerBaseUnit: cheapestBuy?.pricePerBaseUnit,
  });
  const marginPercentFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

  // Penawaran aktif berhaga untuk kartu "Rekomendasi Harga Jual" — harga
  // per kemasan SETELAH pajak (sama seperti margin), diurutkan termurah
  // dulu supaya penawaran termurah yang terpilih bawaan.
  const recommendationOffers = offers
    .filter((offer) => offer.isActive && offer.prices[0])
    .map((offer) => {
      const pricePerPackageAfterTax = calculateSubtotal({
        packagesToBuy: 1,
        pricePerPackage: offer.prices[0]!.pricePerPackage,
        taxStatus: offer.prices[0]!.taxStatus,
        taxRatePercent: offer.prices[0]!.taxRateValueSnapshot ?? 0,
      }).pricePerPackageAfterTax;
      return {
        id: offer.id,
        supplierName: offer.supplier.supplierName,
        packageLabel: `${PACKAGING_TYPE_LABELS[offer.packageType]} · ${Number(offer.itemsPerPackage)} x ${Number(offer.contentPerItem)} ${MEASUREMENT_UNIT_LABELS[offer.contentUnit]} = ${Number(offer.totalPackageContent)} ${BASE_UNIT_LABELS[offer.baseUnit]}`,
        pricePerPackageAfterTax: pricePerPackageAfterTax.toString(),
        totalPackageContent: offer.totalPackageContent.toString(),
        pricePerBaseUnit: calculatePricePerBaseUnit(
          pricePerPackageAfterTax,
          offer.totalPackageContent,
        ).toNumber(),
      };
    })
    .sort((a, b) => a.pricePerBaseUnit - b.pricePerBaseUnit)
    .map(({ pricePerBaseUnit: _pricePerBaseUnit, ...offer }) => offer);

  return (
    <div>
      <BackLink href="/produk" label="Kembali ke Produk" />
      <PageHeader title={product.productName} description="Ubah data produk atau nonaktifkan." />

      <div className="space-y-6">
        <Card>
          <p className="text-sm text-slate-600">
            Stok toko:{" "}
            <span className="font-semibold text-slate-900">
              {Number(product.stockQty)} {BASE_UNIT_LABELS[product.baseUnit]}
            </span>
            {product.lowStockThreshold !== null &&
            Number(product.stockQty) <= Number(product.lowStockThreshold) ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Stok menipis
              </span>
            ) : null}
            {product.lowStockThreshold !== null ? (
              <span className="text-slate-500">
                {" "}
                (ambang {Number(product.lowStockThreshold)} {BASE_UNIT_LABELS[product.baseUnit]})
              </span>
            ) : null}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-600">
            Harga jual:{" "}
            <span className="font-semibold text-slate-900">
              {product.sellPricePerBaseUnit !== null
                ? `${formatRupiah(Number(product.sellPricePerBaseUnit))}/${BASE_UNIT_LABELS[product.baseUnit]}`
                : "— (belum diatur)"}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Harga beli termurah:{" "}
            <span className="font-semibold text-slate-900">
              {cheapestBuy
                ? `${formatRupiah(Number(cheapestBuy.pricePerBaseUnit))}/${BASE_UNIT_LABELS[product.baseUnit]} (${cheapestBuy.supplierName})`
                : "— (belum ada penawaran)"}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Margin:{" "}
            {margin ? (
              <span
                className={
                  margin.amount.isNegative()
                    ? "font-semibold text-red-600"
                    : "font-semibold text-emerald-600"
                }
              >
                {formatRupiah(margin.amount.toNumber())}/{BASE_UNIT_LABELS[product.baseUnit]}
                {margin.percent !== null
                  ? ` (${marginPercentFormatter.format(margin.percent.toNumber())}%)`
                  : ""}
              </span>
            ) : (
              <span className="text-slate-500">— (atur harga jual dulu)</span>
            )}
          </p>
        </Card>

        <SellRecommendation
          productId={product.id}
          baseUnitLabel={BASE_UNIT_LABELS[product.baseUnit]}
          offers={recommendationOffers}
        />

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
            stockQty: product.stockQty.toString(),
            lowStockThreshold: product.lowStockThreshold?.toString() ?? null,
            sellPricePerBaseUnit: product.sellPricePerBaseUnit?.toString() ?? null,
          }}
          categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        />

        <div className="flex flex-wrap items-center gap-3">
          <ProductStatusButton productId={product.id} isActive={product.isActive} />
          <ProductDeleteButton productId={product.id} />
        </div>
        <p className="-mt-4 text-xs text-slate-500">
          Nonaktifkan bisa diaktifkan lagi sewaktu-waktu. Hapus permanen hanya bisa dilakukan untuk
          produk yang belum pernah dipesan ke supplier manapun dan tidak punya penawaran aktif.
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
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            Riwayat Harga Beli ({priceHistory.length})
          </h2>
          {priceHistory.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat harga"
              description="Harga penawaran yang diubah dan harga pembelian dari pesanan yang sudah dikonfirmasi akan tercatat di sini."
            />
          ) : (
            <PriceHistoryTable
              rows={priceHistory.map((row) => ({
                id: row.id,
                date: row.date.toISOString(),
                source: row.source,
                supplierName: row.supplierName,
                orderNumber: row.orderNumber,
                packageType: row.packageType,
                itemsPerPackage: row.itemsPerPackage.toString(),
                contentPerItem: row.contentPerItem.toString(),
                contentUnit: row.contentUnit,
                totalPackageContent: row.totalPackageContent.toString(),
                baseUnit: row.baseUnit,
                taxStatus: row.taxStatus,
                pricePerPackage: row.pricePerPackage.toString(),
                pricePerBaseUnit: row.pricePerBaseUnit.toString(),
                change: row.change
                  ? {
                      amountChange: row.change.amountChange.toString(),
                      percentChange: row.change.percentChange?.toString() ?? null,
                      direction: row.change.direction,
                    }
                  : null,
              }))}
            />
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

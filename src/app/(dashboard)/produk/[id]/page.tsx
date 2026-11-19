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
  displayUnitLabel,
  MEASUREMENT_UNIT_LABELS,
  PACKAGING_TYPE_LABELS,
  TAX_STATUS_LABELS,
} from "@/lib/format/units";
import { displayPackageContent, toDisplayQty } from "@/lib/domain/stock/package-qty";

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

  // Satuan tampil: produk hitungan yang dijual per renceng (ada penawaran
  // aktif berkemas RENCENG) tampil "Renceng", bukan "pcs" — mis. Susu
  // Bendera. Dipakai di semua angka per satuan di halaman ini.
  const displayUnit = displayUnitLabel(
    product.baseUnit,
    offers.filter((offer) => offer.isActive),
  );
  const baseUnitLabel = BASE_UNIT_LABELS[product.baseUnit];
  // Isi satu renceng dalam satuan dasar (10 untuk Kopi Good Day: 1
  // renceng = 10 pcs), 1 bila produk tidak dijual per renceng.
  const displayContent = displayPackageContent(
    offers
      .filter((offer) => offer.isActive)
      .map((offer) => ({
        packageType: offer.packageType,
        totalPackageContent: Number(offer.totalPackageContent),
        pricePerPackage: offer.prices[0] ? Number(offer.prices[0].pricePerPackage) : undefined,
      })),
  );

  // Dipakai dua kali di bawah (form ubah per penawaran + form tambah) -
  // dihitung sekali supaya tidak menduplikasi map yang sama.
  const taxRateOptions = taxRates.map((rate) => ({
    id: rate.id,
    name: rate.name,
    ratePercent: rate.ratePercent.toString(),
  }));

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
        packageLabel: `${PACKAGING_TYPE_LABELS[offer.packageType]} · ${Number(offer.itemsPerPackage)} x ${Number(offer.contentPerItem)} ${MEASUREMENT_UNIT_LABELS[offer.contentUnit]} = ${Number(offer.totalPackageContent)} ${displayUnit}`,
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
              {toDisplayQty(Number(product.stockQty), displayContent)} {displayUnit}
            </span>
            {displayContent > 1 ? (
              <span className="text-slate-500">
                {" "}
                ({Number(product.stockQty)} {baseUnitLabel})
              </span>
            ) : null}
            {product.lowStockThreshold !== null &&
            Number(product.stockQty) <= Number(product.lowStockThreshold) ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Stok menipis
              </span>
            ) : null}
            {product.lowStockThreshold !== null ? (
              <span className="text-slate-500">
                {" "}
                (ambang {Number(product.lowStockThreshold)} {displayUnit})
              </span>
            ) : null}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-600">
            Harga jual:{" "}
            <span className="font-semibold text-slate-900">
              {product.sellPricePerBaseUnit !== null
                ? `${formatRupiah(Number(product.sellPricePerBaseUnit) * displayContent)}/${displayUnit}`
                : "— (belum diatur)"}
            </span>
            {displayContent > 1 && product.sellPricePerBaseUnit !== null ? (
              <span className="text-slate-500">
                {" "}
                ({formatRupiah(Number(product.sellPricePerBaseUnit))}/{baseUnitLabel})
              </span>
            ) : null}
          </p>
          {product.eceranPricePerBaseUnit !== null && product.unitFamily === "COUNT" ? (
            <p className="mt-1 text-sm text-slate-600">
              Harga jual eceran:{" "}
              <span className="font-semibold text-slate-900">
                {formatRupiah(Number(product.eceranPricePerBaseUnit))}/{baseUnitLabel}
              </span>
            </p>
          ) : null}
          <p className="mt-1 text-sm text-slate-600">
            Harga beli termurah:{" "}
            <span className="font-semibold text-slate-900">
              {cheapestBuy
                ? `${formatRupiah(Number(cheapestBuy.pricePerBaseUnit) * displayContent)}/${displayUnit} (${cheapestBuy.supplierName})`
                : "— (belum ada penawaran)"}
            </span>
            {displayContent > 1 && cheapestBuy ? (
              <span className="text-slate-500">
                {" "}
                ({formatRupiah(Number(cheapestBuy.pricePerBaseUnit))}/{baseUnitLabel})
              </span>
            ) : null}
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
                {formatRupiah(margin.amount.toNumber() * displayContent)}/{displayUnit}
                {margin.percent !== null
                  ? ` (${marginPercentFormatter.format(margin.percent.toNumber())}%)`
                  : ""}
              </span>
            ) : (
              <span className="text-slate-500">— (atur harga jual dulu)</span>
            )}
            {displayContent > 1 && margin ? (
              <span className="text-slate-500">
                {" "}
                ({formatRupiah(margin.amount.toNumber())}/{baseUnitLabel})
              </span>
            ) : null}
          </p>
        </Card>

        <SellRecommendation
          productId={product.id}
          baseUnitLabel={baseUnitLabel}
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
            eceranPricePerBaseUnit: product.eceranPricePerBaseUnit?.toString() ?? null,
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
                          {Number(offer.totalPackageContent)} {displayUnit}
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
                    <OfferActions
                      productId={product.id}
                      unitFamily={product.unitFamily}
                      taxRates={taxRateOptions}
                      offer={{
                        id: offer.id,
                        supplierName: offer.supplier.supplierName,
                        isActive: offer.isActive,
                        packageType: offer.packageType,
                        itemsPerPackage: offer.itemsPerPackage.toString(),
                        contentPerItem: offer.contentPerItem.toString(),
                        contentUnit: offer.contentUnit,
                        minPurchasePackages: offer.minPurchasePackages.toString(),
                        purchaseMultiplePackages: offer.purchaseMultiplePackages.toString(),
                        supplierSkuOrName: offer.supplierSkuOrName ?? "",
                        pricePerPackage: price ? price.pricePerPackage.toString() : "",
                        taxStatus: price ? price.taxStatus : "NONE",
                        taxRateId: price?.taxRate?.id ?? "",
                        estimatedDeliveryDaysMin: offer.estimatedDeliveryDaysMin?.toString() ?? "",
                        estimatedDeliveryDaysMax: offer.estimatedDeliveryDaysMax?.toString() ?? "",
                      }}
                    />
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
            taxRates={taxRateOptions}
          />
        </div>
      </div>
    </div>
  );
}

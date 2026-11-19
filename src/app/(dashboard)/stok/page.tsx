import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listProducts } from "@/lib/server/repositories/product-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { formatRupiah } from "@/lib/format/currency";
import {
  BASE_UNIT_LABELS,
  displayUnitLabel,
  MEASUREMENT_UNIT_LABELS,
  PACKAGING_TYPE_LABELS,
} from "@/lib/format/units";
import { computeCheapestBuyPricePerBaseUnit, computeMargin } from "@/lib/domain/pricing/margin";
import { calculateSubtotal } from "@/lib/domain/pricing/subtotal";
import { calculatePricePerBaseUnit } from "@/lib/domain/pricing/unit-price";
import { displayPackageContent, toDisplayQty } from "@/lib/domain/stock/package-qty";
import { EditableSellPrice } from "@/components/stok/EditableSellPrice";
import { EditableEceranPrice } from "@/components/stok/EditableEceranPrice";
import { StockAdjuster } from "@/components/stok/StockAdjuster";
import { SellButton } from "@/components/stok/SellButton";

export const metadata: Metadata = { title: "Stok Toko" };
export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const marginPercentFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

type StockStatus = "habis" | "ada";
type StockFilter = "ada" | "semua" | StockStatus;

const FILTERS: { key: StockFilter; label: string }[] = [
  { key: "ada", label: "Ada Stok" },
  { key: "habis", label: "Habis" },
  { key: "semua", label: "Semua" },
];

function stockStatus(stockQty: number): StockStatus {
  return stockQty <= 0 ? "habis" : "ada";
}

const STATUS_ORDER: Record<StockStatus, number> = { habis: 0, ada: 1 };

export default async function StokTokoPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await requireSession();
  const { filter } = await searchParams;
  // Default: hanya produk yang ada stoknya. Produk kosong (Habis) tidak
  // dimasukkan ke daftar, tapi tetap bisa dilihat lewat filter Habis/Semua.
  const activeFilter: StockFilter = FILTERS.some((item) => item.key === filter)
    ? (filter as StockFilter)
    : "ada";

  // Hanya produk aktif — stok produk nonaktif bukan stok toko yang dijual.
  const products = await listProducts(session.user.businessId);

  const rows = products
    .map((product) => {
      const stockQty = Number(product.stockQty);
      const baseUnitLabel = BASE_UNIT_LABELS[product.baseUnit];
      // Harga beli = penawaran aktif termurah per satuan dasar (setelah
      // pajak), pola yang sama dengan halaman Produk.
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
      // Kemasan penawaran termurah (aturan yang sama dengan Harga Beli) —
      // dipakai untuk harga jual per kemasan, mis. bungkus 250 gram.
      const pricedOffers = product.supplierProducts.filter((offer) => offer.prices[0]);
      let cheapestOffer: (typeof pricedOffers)[number] | null = null;
      let cheapestPerBaseUnit: ReturnType<typeof calculatePricePerBaseUnit> | null = null;
      for (const offer of pricedOffers) {
        const perBaseUnit = calculatePricePerBaseUnit(
          calculateSubtotal({
            packagesToBuy: 1,
            pricePerPackage: offer.prices[0]!.pricePerPackage,
            taxStatus: offer.prices[0]!.taxStatus,
            taxRatePercent: offer.prices[0]!.taxRateValueSnapshot ?? 0,
          }).pricePerPackageAfterTax,
          offer.totalPackageContent,
        );
        if (cheapestPerBaseUnit === null || perBaseUnit.lessThan(cheapestPerBaseUnit)) {
          cheapestPerBaseUnit = perBaseUnit;
          cheapestOffer = offer;
        }
      }
      // Harga jual per kemasan = harga jual per satuan dasar x isi kemasan
      // penawaran termurah. Hanya bila kemasan bukan 1 satuan dasar (mis.
      // bungkus 250 gram) dan produk sudah punya harga jual.
      const packageContent = cheapestOffer ? Number(cheapestOffer.totalPackageContent) : null;
      const sellPerPackage =
        product.sellPricePerBaseUnit !== null && packageContent !== null && packageContent !== 1
          ? Number(product.sellPricePerBaseUnit) * packageContent
          : null;
      const packageLabel =
        cheapestOffer === null
          ? null
          : product.unitFamily === "COUNT"
            ? `${numberFormatter.format(Number(cheapestOffer.itemsPerPackage))} ${MEASUREMENT_UNIT_LABELS.PCS}`
            : `${numberFormatter.format(Number(cheapestOffer.contentPerItem))} ${MEASUREMENT_UNIT_LABELS[cheapestOffer.contentUnit]}`;
      // Harga beli per kemasan pakai aturan yang sama (beli termurah per
      // satuan dasar x isi kemasan), dan selisih keuntungan = jual − beli.
      const buyPerPackage =
        cheapestBuy !== null && packageContent !== null && packageContent !== 1
          ? cheapestBuy.pricePerBaseUnit.toNumber() * packageContent
          : null;
      const margin = computeMargin({
        sellPricePerBaseUnit: product.sellPricePerBaseUnit,
        buyPricePerBaseUnit: cheapestBuy?.pricePerBaseUnit,
      });
      const marginPerPackage =
        sellPerPackage !== null && buyPerPackage !== null ? sellPerPackage - buyPerPackage : null;
      // Nilai stok = stok × harga beli termurah (modal yang tertanam di
      // barang yang ada). Null bila belum ada harga beli / harga jual.
      const stockValue =
        cheapestBuy === null ? null : stockQty * cheapestBuy.pricePerBaseUnit.toNumber();
      const stockSellValue =
        product.sellPricePerBaseUnit === null
          ? null
          : stockQty * Number(product.sellPricePerBaseUnit);
      // Satuan tampil renceng: isi satu renceng dalam satuan dasar
      // (10 untuk Kopi Good Day: 1 renceng = 10 pcs), 1 bila produk
      // tidak dijual per renceng. Harga per satuan tampil = harga per
      // satuan dasar x isi ini.
      const displayContent = displayPackageContent(
        product.supplierProducts.map((offer) => ({
          packageType: offer.packageType,
          totalPackageContent: Number(offer.totalPackageContent),
          pricePerPackage: offer.prices[0] ? Number(offer.prices[0].pricePerPackage) : undefined,
        })),
      );
      const displayUnit = displayUnitLabel(product.baseUnit, product.supplierProducts);
      // Baris kecil di bawah stok: satuan yang satunya lagi — "30 pcs"
      // untuk produk renceng, "2 Karung" / "20 Pak" untuk produk yang
      // kemasan termurahnya berisi lebih dari 1 satuan dasar.
      const stockSubline =
        displayContent > 1
          ? `${numberFormatter.format(stockQty)} ${baseUnitLabel}`
          : packageContent !== null && packageContent > 1 && cheapestOffer !== null
            ? `${numberFormatter.format(stockQty / packageContent)} ${PACKAGING_TYPE_LABELS[cheapestOffer.packageType]}`
            : null;
      return {
        id: product.id,
        productName: product.productName,
        categoryName: product.category?.name ?? null,
        stockQty,
        unitFamily: product.unitFamily,
        baseUnit: product.baseUnit,
        baseUnitLabel,
        displayUnit,
        displayContent,
        displayQty: toDisplayQty(stockQty, displayContent),
        stockSubline,
        sellPricePerBaseUnit: product.sellPricePerBaseUnit,
        eceranPricePerBaseUnit:
          product.eceranPricePerBaseUnit === null ? null : Number(product.eceranPricePerBaseUnit),
        cheapestBuyPerBaseUnit: cheapestBuy?.pricePerBaseUnit.toNumber() ?? null,
        buyPerDisplayUnit:
          cheapestBuy === null ? null : cheapestBuy.pricePerBaseUnit.toNumber() * displayContent,
        sellPerPackage,
        buyPerPackage,
        packageLabel,
        packageContent,
        cheapestPackageTypeLabel:
          cheapestOffer === null ? null : PACKAGING_TYPE_LABELS[cheapestOffer.packageType],
        marginAmount: margin === null ? null : margin.amount.toNumber(),
        marginPercent: margin?.percent?.toNumber() ?? null,
        marginPerPackage,
        stockValue,
        stockSellValue,
        status: stockStatus(stockQty),
      };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const counts: Record<StockFilter, number> = {
    ada: rows.filter((row) => row.status !== "habis").length,
    semua: rows.length,
    habis: rows.filter((row) => row.status === "habis").length,
  };

  // Total nilai stok — dihitung dari stok yang ADA sekarang, jadi otomatis
  // berkurang begitu ada barang yang habis/terjual. Dihitung dari SEMUA
  // produk (bukan hanya yang tampil di filter), karena produk kosong
  // nilainya 0 dan tidak mengubah total.
  const totals = rows.reduce(
    (acc, row) => ({
      buy: acc.buy + (row.stockValue ?? 0),
      sell: acc.sell + (row.stockSellValue ?? 0),
    }),
    { buy: 0, sell: 0 },
  );
  const totalProfit = totals.sell - totals.buy;
  const totalProfitPercent = totals.buy > 0 ? (totalProfit / totals.buy) * 100 : null;
  const stockedCount = rows.filter((row) => row.stockQty > 0).length;
  const visibleRows =
    activeFilter === "semua"
      ? rows
      : activeFilter === "ada"
        ? rows.filter((row) => row.status !== "habis")
        : rows.filter((row) => row.status === activeFilter);

  return (
    <div>
      <PageHeader title="Stok Toko" description="Stok toko saat ini per produk." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total Produk" value={counts.semua} description="Produk aktif" />
        <StatCard
          label="Total Harga Beli (Rp)"
          value={totals.buy}
          description="Modal semua stok yang ada"
          variant="dark"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={item.key === "ada" ? "/stok" : `/stok?filter=${item.key}`}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === item.key
                ? "border-slate bg-slate text-white"
                : "border-divider text-slate hover:border-cloud bg-white"
            }`}
          >
            {item.label} ({counts[item.key]})
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Belum ada produk"
          description="Tambahkan produk terlebih dahulu pada menu Produk sebelum melihat stok toko."
        />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          title="Tidak ada produk pada filter ini"
          description="Coba filter lain untuk melihat produk dengan status stok yang berbeda."
        />
      ) : (
        <div className="border-divider overflow-x-auto rounded-[20px] border bg-white">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead>
              <tr className="border-divider border-b text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Produk</th>
                <th className="px-4 py-3 font-medium">Stok</th>
                <th className="px-4 py-3 font-medium">Harga Beli</th>
                <th className="px-4 py-3 font-medium">Harga Jual</th>
                <th className="px-4 py-3 font-medium">Keuntungan</th>
                <th className="px-4 py-3 font-medium">Nilai Stok</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} className="border-divider border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/produk/${row.id}`}
                      className="hover:text-slate font-medium text-slate-900"
                    >
                      {row.productName}
                    </Link>
                    {row.categoryName ? (
                      <p className="text-xs text-slate-500">{row.categoryName}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <StockAdjuster
                      productId={row.id}
                      stockQtyBase={row.stockQty}
                      displayUnit={row.displayUnit}
                      packageContent={row.displayContent}
                      stockSubline={row.stockSubline}
                    />
                    {row.status === "habis" ? (
                      <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Habis
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.buyPerDisplayUnit === null
                      ? "—"
                      : `${formatRupiah(row.buyPerDisplayUnit)}/${row.displayUnit}`}
                    {row.displayContent > 1 && row.cheapestBuyPerBaseUnit !== null ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatRupiah(row.cheapestBuyPerBaseUnit)}/{row.baseUnitLabel}
                      </p>
                    ) : null}
                    {row.displayContent === 1 &&
                    row.buyPerPackage !== null &&
                    row.packageLabel !== null ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatRupiah(row.buyPerPackage)} / {row.packageLabel}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <EditableSellPrice
                      productId={row.id}
                      initialValue={
                        row.sellPricePerBaseUnit === null ? null : Number(row.sellPricePerBaseUnit)
                      }
                      unitLabel={row.displayUnit}
                      packageContent={row.displayContent}
                    />
                    {row.displayContent > 1 && row.sellPricePerBaseUnit !== null ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatRupiah(Number(row.sellPricePerBaseUnit))}/{row.baseUnitLabel}
                      </p>
                    ) : null}
                    {row.displayContent === 1 &&
                    row.sellPerPackage !== null &&
                    row.packageLabel !== null ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatRupiah(row.sellPerPackage)} / {row.packageLabel}
                      </p>
                    ) : null}
                    {row.unitFamily === "COUNT" ? (
                      <div className="mt-1 text-xs">
                        <EditableEceranPrice
                          productId={row.id}
                          initialValue={row.eceranPricePerBaseUnit}
                          unitLabel={row.baseUnitLabel}
                        />
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.marginAmount === null ? (
                      "—"
                    ) : (
                      <>
                        {row.marginPercent !== null ? (
                          <span
                            className={`font-semibold ${row.marginPercent < 0 ? "text-red-600" : "text-emerald-600"}`}
                          >
                            {marginPercentFormatter.format(row.marginPercent)}%
                          </span>
                        ) : null}
                        <p className="mt-1 text-xs text-slate-500">
                          {row.marginPerPackage !== null && row.packageLabel !== null
                            ? `${formatRupiah(row.marginPerPackage)} / ${row.packageLabel}`
                            : `${formatRupiah(row.marginAmount)}/${row.displayUnit}`}
                        </p>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.stockValue === null ? (
                      "—"
                    ) : (
                      <span className="font-semibold text-slate-900">
                        {formatRupiah(row.stockValue)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SellButton
                      product={{
                        id: row.id,
                        productName: row.productName,
                        stockQtyBase: row.stockQty,
                        displayUnit: row.displayUnit,
                        displayPackageContent: row.displayContent,
                        baseUnitLabel: row.baseUnitLabel,
                        packageLabel:
                          row.packageContent !== null && row.packageContent > 1
                            ? row.cheapestPackageTypeLabel
                            : null,
                        packageContent: row.packageContent,
                        sellPerBase:
                          row.sellPricePerBaseUnit === null
                            ? null
                            : Number(row.sellPricePerBaseUnit),
                        eceranPerBase: row.eceranPricePerBaseUnit,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-divider border-t bg-slate-50 font-semibold text-slate-900">
                <td className="px-4 py-3" colSpan={2}>
                  Total ({stockedCount} produk ada stok)
                </td>
                <td className="px-4 py-3 text-slate-400">—</td>
                <td className="px-4 py-3">{formatRupiah(totals.sell)}</td>
                <td className="px-4 py-3">
                  <span className={totalProfit < 0 ? "text-red-600" : "text-emerald-600"}>
                    {formatRupiah(totalProfit)}
                    {totalProfitPercent !== null
                      ? ` (${marginPercentFormatter.format(totalProfitPercent)}%)`
                      : ""}
                  </span>
                </td>
                <td className="px-4 py-3">{formatRupiah(totals.buy)}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

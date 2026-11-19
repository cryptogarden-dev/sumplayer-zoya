import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listProducts } from "@/lib/server/repositories/product-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { formatRupiah } from "@/lib/format/currency";
import { BASE_UNIT_LABELS, MEASUREMENT_UNIT_LABELS } from "@/lib/format/units";
import { computeCheapestBuyPricePerBaseUnit, computeMargin } from "@/lib/domain/pricing/margin";
import { calculateSubtotal } from "@/lib/domain/pricing/subtotal";
import { calculatePricePerBaseUnit } from "@/lib/domain/pricing/unit-price";
import { EditableSellPrice } from "@/components/stok/EditableSellPrice";

export const metadata: Metadata = { title: "Stok Toko" };
export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const marginPercentFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

type StockStatus = "habis" | "menipis" | "aman";
type StockFilter = "ada" | "semua" | StockStatus;

const FILTERS: { key: StockFilter; label: string }[] = [
  { key: "ada", label: "Ada Stok" },
  { key: "habis", label: "Habis" },
  { key: "menipis", label: "Menipis" },
  { key: "aman", label: "Aman" },
  { key: "semua", label: "Semua" },
];

/**
 * Status stok mengikuti aturan ambang yang sama dengan kartu Beranda:
 * habis bila stok 0; menipis bila ada ambang dan stok sudah mencapai /
 * melewatinya; selain itu aman.
 */
function stockStatus(stockQty: number, threshold: number | null): StockStatus {
  if (stockQty <= 0) return "habis";
  if (threshold !== null && stockQty <= threshold) return "menipis";
  return "aman";
}

const STATUS_ORDER: Record<StockStatus, number> = { habis: 0, menipis: 1, aman: 2 };

const STATUS_PILL_CLASSES: Record<Exclude<StockStatus, "aman">, string> = {
  habis: "bg-red-100 text-red-700",
  menipis: "bg-amber-100 text-amber-700",
};

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
      const threshold =
        product.lowStockThreshold === null ? null : Number(product.lowStockThreshold);
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
      return {
        id: product.id,
        productName: product.productName,
        categoryName: product.category?.name ?? null,
        stockQty,
        threshold,
        baseUnit: product.baseUnit,
        sellPricePerBaseUnit: product.sellPricePerBaseUnit,
        cheapestBuyPerBaseUnit: cheapestBuy?.pricePerBaseUnit.toNumber() ?? null,
        sellPerPackage,
        buyPerPackage,
        packageLabel,
        marginAmount: margin === null ? null : margin.amount.toNumber(),
        marginPercent: margin?.percent?.toNumber() ?? null,
        marginPerPackage,
        status: stockStatus(stockQty, threshold),
      };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const counts: Record<StockFilter, number> = {
    ada: rows.filter((row) => row.status !== "habis").length,
    semua: rows.length,
    habis: rows.filter((row) => row.status === "habis").length,
    menipis: rows.filter((row) => row.status === "menipis").length,
    aman: rows.filter((row) => row.status === "aman").length,
  };
  const visibleRows =
    activeFilter === "semua"
      ? rows
      : activeFilter === "ada"
        ? rows.filter((row) => row.status !== "habis")
        : rows.filter((row) => row.status === activeFilter);

  return (
    <div>
      <PageHeader title="Stok Toko" description="Stok toko saat ini per produk." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Produk" value={counts.semua} description="Produk aktif" />
        <StatCard
          label="Stok Menipis"
          value={counts.menipis}
          description="Mencapai ambang stok menipis"
        />
        <StatCard label="Stok Habis" value={counts.habis} description="Stok 0, perlu dipesan" />
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
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-divider border-b text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Produk</th>
                <th className="px-4 py-3 font-medium">Stok</th>
                <th className="px-4 py-3 font-medium">Ambang</th>
                <th className="px-4 py-3 font-medium">Harga Beli</th>
                <th className="px-4 py-3 font-medium">Harga Jual</th>
                <th className="px-4 py-3 font-medium">Keuntungan</th>
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
                    <span className="font-semibold text-slate-900">
                      {numberFormatter.format(row.stockQty)} {BASE_UNIT_LABELS[row.baseUnit]}
                    </span>
                    {row.status !== "aman" ? (
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL_CLASSES[row.status]}`}
                      >
                        {row.status === "habis" ? "Habis" : "Menipis"}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.threshold === null
                      ? "—"
                      : `${numberFormatter.format(row.threshold)} ${BASE_UNIT_LABELS[row.baseUnit]}`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.cheapestBuyPerBaseUnit === null
                      ? "—"
                      : `${formatRupiah(row.cheapestBuyPerBaseUnit)}/${BASE_UNIT_LABELS[row.baseUnit]}`}
                    {row.buyPerPackage !== null && row.packageLabel !== null ? (
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
                      unitLabel={BASE_UNIT_LABELS[row.baseUnit]}
                    />
                    {row.sellPerPackage !== null && row.packageLabel !== null ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatRupiah(row.sellPerPackage)} / {row.packageLabel}
                      </p>
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
                            : `${formatRupiah(row.marginAmount)}/${BASE_UNIT_LABELS[row.baseUnit]}`}
                        </p>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listProducts } from "@/lib/server/repositories/product-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { formatRupiah } from "@/lib/format/currency";
import { BASE_UNIT_LABELS } from "@/lib/format/units";

export const metadata: Metadata = { title: "Stok Toko" };
export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

type StockStatus = "habis" | "menipis" | "aman";
type StockFilter = "semua" | StockStatus;

const FILTERS: { key: StockFilter; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "habis", label: "Habis" },
  { key: "menipis", label: "Menipis" },
  { key: "aman", label: "Aman" },
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
  const activeFilter: StockFilter = FILTERS.some((item) => item.key === filter)
    ? (filter as StockFilter)
    : "semua";

  // Hanya produk aktif — stok produk nonaktif bukan stok toko yang dijual.
  const products = await listProducts(session.user.businessId);

  const rows = products
    .map((product) => {
      const stockQty = Number(product.stockQty);
      const threshold =
        product.lowStockThreshold === null ? null : Number(product.lowStockThreshold);
      return {
        id: product.id,
        productName: product.productName,
        categoryName: product.category?.name ?? null,
        stockQty,
        threshold,
        baseUnit: product.baseUnit,
        sellPricePerBaseUnit: product.sellPricePerBaseUnit,
        status: stockStatus(stockQty, threshold),
      };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const counts: Record<StockFilter, number> = {
    semua: rows.length,
    habis: rows.filter((row) => row.status === "habis").length,
    menipis: rows.filter((row) => row.status === "menipis").length,
    aman: rows.filter((row) => row.status === "aman").length,
  };
  const visibleRows =
    activeFilter === "semua" ? rows : rows.filter((row) => row.status === activeFilter);

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
            href={item.key === "semua" ? "/stok" : `/stok?filter=${item.key}`}
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
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-divider border-b text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Produk</th>
                <th className="px-4 py-3 font-medium">Stok</th>
                <th className="px-4 py-3 font-medium">Ambang</th>
                <th className="px-4 py-3 font-medium">Harga Jual</th>
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
                    {row.sellPricePerBaseUnit === null
                      ? "—"
                      : `${formatRupiah(Number(row.sellPricePerBaseUnit))}/${BASE_UNIT_LABELS[row.baseUnit]}`}
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

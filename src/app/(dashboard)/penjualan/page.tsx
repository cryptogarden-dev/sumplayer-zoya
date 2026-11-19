import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { getSalesSummary, listStockMovements } from "@/lib/server/repositories/product-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { formatRupiah } from "@/lib/format/currency";
import { getPeriodRange, type SalesPeriod } from "@/lib/domain/sales/period-range";

export const metadata: Metadata = { title: "Penjualan" };
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

const PERIOD_FILTERS: { key: Exclude<SalesPeriod, "custom">; label: string }[] = [
  { key: "hari", label: "Hari Ini" },
  { key: "minggu", label: "Minggu Ini" },
  { key: "bulan", label: "Bulan Ini" },
  { key: "semua", label: "Semua" },
];

/**
 * Riwayat penjualan dari Stok Toko (tombol Jual, per renceng atau per
 * pcs). Setiap penjualan mengurangi stok dan tercatat di sini beserta
 * nilainya, jadi total omzet bisa dicek tanpa buka catatan lain.
 * Periode bawaan selalu Bulan Ini; bisa diganti ke Hari Ini / Minggu Ini
 * / Semua, atau rentang tanggal sendiri lewat form di bawah.
 */
export default async function PenjualanPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; dari?: string; sampai?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  // Rentang tanggal sendiri (custom) menang atas chip periode.
  const periode: SalesPeriod =
    params.dari || params.sampai
      ? "custom"
      : PERIOD_FILTERS.some((item) => item.key === params.periode)
        ? (params.periode as SalesPeriod)
        : "bulan";
  const range = getPeriodRange(periode, new Date(), {
    from: params.dari,
    to: params.sampai,
  });
  const dateFilter = range ? { from: range.from, to: range.to } : {};
  const [summary, movements] = await Promise.all([
    getSalesSummary(session.user.businessId, dateFilter),
    listStockMovements(session.user.businessId, {
      type: "PENJUALAN",
      take: 100,
      ...dateFilter,
    }),
  ]);
  const periodLabel = range ? range.label : "Semua penjualan";

  return (
    <div>
      <PageHeader
        title="Penjualan"
        description="Penjualan yang dicatat dari Stok Toko — per renceng atau per pcs."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIOD_FILTERS.map((item) => (
          <Link
            key={item.key}
            href={item.key === "bulan" ? "/penjualan" : `/penjualan?periode=${item.key}`}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              periode === item.key
                ? "border-slate bg-slate text-white"
                : "border-divider text-slate hover:border-cloud bg-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <form
        method="get"
        action="/penjualan"
        className="border-divider mb-4 flex flex-wrap items-end gap-3 rounded-[20px] border bg-white px-4 py-3"
      >
        <div>
          <Label htmlFor="dari">Dari tanggal</Label>
          <Input id="dari" name="dari" type="date" defaultValue={params.dari ?? ""} />
        </div>
        <div>
          <Label htmlFor="sampai">Sampai tanggal</Label>
          <Input id="sampai" name="sampai" type="date" defaultValue={params.sampai ?? ""} />
        </div>
        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
        {periode === "custom" ? (
          <Link
            href="/penjualan"
            className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Kembali ke Bulan Ini
          </Link>
        ) : null}
      </form>

      <p className="mb-6 text-sm text-slate-500">Menampilkan: {periodLabel}</p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Penjualan (Rp)"
          value={summary.totalAmount}
          description={`Omzet tercatat dari Stok Toko · ${periodLabel}`}
          variant="dark"
        />
        <StatCard
          label="Jumlah Penjualan"
          value={summary.count}
          description={`Transaksi tercatat · ${periodLabel}`}
        />
      </div>

      {movements.length === 0 ? (
        <EmptyState
          title="Belum ada penjualan pada periode ini"
          description={`Tidak ada penjualan tercatat untuk ${periodLabel}. Coba periode lain atau jual produk lewat tombol Jual di Stok Toko.`}
        />
      ) : (
        <div className="border-divider overflow-x-auto rounded-[20px] border bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-divider border-b text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Produk</th>
                <th className="px-4 py-3 font-medium">Jumlah</th>
                <th className="px-4 py-3 font-medium">Harga Satuan</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-divider border-b last:border-b-0">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {dateFormatter.format(movement.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {movement.product.productName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {numberFormatter.format(Number(movement.unitQuantity))} {movement.unitLabel}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {movement.unitPrice === null
                      ? "—"
                      : `${formatRupiah(Number(movement.unitPrice))}/${movement.unitLabel}`}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {movement.totalAmount === null
                      ? "—"
                      : formatRupiah(Number(movement.totalAmount))}
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

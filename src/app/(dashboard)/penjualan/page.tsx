import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getSalesSummary, listStockMovements } from "@/lib/server/repositories/product-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { formatRupiah } from "@/lib/format/currency";

export const metadata: Metadata = { title: "Penjualan" };
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

/**
 * Riwayat penjualan dari Stok Toko (tombol Jual, per renceng atau per
 * pcs). Setiap penjualan mengurangi stok dan tercatat di sini beserta
 * nilainya, jadi total omzet bisa dicek tanpa buka catatan lain.
 */
export default async function PenjualanPage() {
  const session = await requireSession();
  const [summary, movements] = await Promise.all([
    getSalesSummary(session.user.businessId),
    listStockMovements(session.user.businessId, { type: "PENJUALAN", take: 100 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Penjualan"
        description="Penjualan yang dicatat dari Stok Toko — per renceng atau per pcs."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Penjualan (Rp)"
          value={summary.totalAmount}
          description="Omzet tercatat dari Stok Toko"
          variant="dark"
        />
        <StatCard label="Jumlah Penjualan" value={summary.count} description="Transaksi tercatat" />
      </div>

      {movements.length === 0 ? (
        <EmptyState
          title="Belum ada penjualan tercatat"
          description="Jual produk lewat tombol Jual di Stok Toko — penjualannya akan tercatat di sini."
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

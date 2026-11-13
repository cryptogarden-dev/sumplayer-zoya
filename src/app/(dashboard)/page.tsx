import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/dashboard/summary";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { BASE_UNIT_LABELS } from "@/lib/format/units";

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export const metadata: Metadata = { title: "Beranda" };
export const dynamic = "force-dynamic";

export default async function BerandaPage() {
  const session = await requireSession();
  const summary = await getDashboardSummary(session.user.businessId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-slate text-[34px] leading-[1.15] font-semibold">
          Selamat datang, {session.user.name}
        </h1>
        <p className="text-muted mt-1 text-[13px]">
          {session.user.businessName} &middot; {ROLE_LABELS[session.user.role]}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Jumlah Supplier"
          value={summary.supplierCount}
          description="Supplier aktif"
        />
        <StatCard
          label="Jumlah Produk"
          value={summary.productCount}
          description="Produk terdaftar"
        />
        <StatCard
          label="Pesanan Aktif"
          value={summary.activeOrderCount}
          description="Belum diterima/dibatalkan"
        />
      </div>

      {summary.lowStockProducts.length > 0 ? (
        <Card className="mt-6 border-amber-300 bg-amber-50">
          <h2 className="text-base font-semibold text-amber-900">
            Stok menipis ({summary.lowStockProducts.length})
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            Produk di bawah ini sudah mencapai atau melewati ambang stok menipis — pertimbangkan
            untuk memesan lagi.
          </p>
          <ul className="mt-3 space-y-2">
            {summary.lowStockProducts.map((product) => (
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <Link
                  href={`/produk/${product.id}`}
                  className="hover:text-slate font-medium text-slate-900"
                >
                  {product.productName}
                </Link>
                <span className="text-amber-800">
                  Stok {numberFormatter.format(Number(product.stockQty))}{" "}
                  {BASE_UNIT_LABELS[product.baseUnit]}
                  {product.lowStockThreshold !== null
                    ? ` (ambang ${numberFormatter.format(Number(product.lowStockThreshold))})`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

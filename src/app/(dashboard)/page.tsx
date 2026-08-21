import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/dashboard/summary";
import { StatCard } from "@/components/ui/StatCard";
import { ROLE_LABELS } from "@/lib/auth/rbac";

export const metadata: Metadata = { title: "Beranda" };
export const dynamic = "force-dynamic";

export default async function BerandaPage() {
  const session = await requireSession();
  const summary = await getDashboardSummary(session.user.businessId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Selamat datang, {session.user.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {session.user.businessName} &middot; {ROLE_LABELS[session.user.role]}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatCard label="Pengingat" value={summary.reminderCount} description="Menunggu tindakan" />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Ringkasan di atas akan otomatis terisi data nyata setelah modul Supplier, Produk, dan
        Pesanan dibangun (lihat docs/IMPLEMENTATION_PLAN.md Tahap 3–5). Nilai nol di atas bukan data
        tiruan — modul terkait memang belum tersedia.
      </p>
    </div>
  );
}

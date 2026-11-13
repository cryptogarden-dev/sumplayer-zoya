import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listSuppliers } from "@/lib/server/repositories/supplier-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Supplier" };
export const dynamic = "force-dynamic";

/**
 * Tahap 3 (langkah 1 - checklist `docs/TAHAP_3_UI_CHECKLIST.md`): daftar
 * supplier saja (baca data), belum ada form tambah/edit. Server Component
 * langsung memanggil repository (pola sama seperti Beranda), bukan lewat
 * `fetch` ke `/api/suppliers`, karena ini render pertama halaman.
 */
export default async function SupplierPage() {
  const session = await requireSession();
  // `includeInactive: true`: supplier nonaktif tetap tampil dengan
  // badge "Nonaktif" (pola sama seperti daftar produk) supaya bisa
  // diaktifkan/dihapus lagi — sebelumnya hilang total dari daftar.
  const suppliers = await listSuppliers(session.user.businessId, { includeInactive: true });

  // KPI dihitung dari data yang sudah diambil (tanpa query tambahan):
  // total, aktif, produk ditawarkan, dan area (pasangan provinsi+kota)
  // yang dilayani. Kartu ke-4 tampil gelap (docs/design/DESIGN_SPEC.md §5).
  const activeCount = suppliers.filter((supplier) => supplier.isActive).length;
  const offeredCount = suppliers.reduce(
    (sum, supplier) => sum + supplier._count.supplierProducts,
    0,
  );
  const areaCount = new Set(suppliers.map((supplier) => `${supplier.province}|${supplier.city}`))
    .size;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Supplier"
          description="Kelola data supplier, kontak, area, dan jadwal pengiriman."
        />
        <Link
          href="/supplier/baru"
          className="bg-slate hover:bg-slate/90 focus-visible:outline-slate inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Tambah Supplier
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Supplier" value={suppliers.length} />
        <StatCard label="Supplier Aktif" value={activeCount} />
        <StatCard label="Produk Ditawarkan" value={offeredCount} />
        <StatCard label="Area Terlayani" value={areaCount} variant="dark" />
      </div>

      {suppliers.length === 0 ? (
        <EmptyState
          title="Belum ada supplier"
          description='Belum ada data supplier untuk bisnis ini. Klik "Tambah Supplier" untuk menambahkan supplier pertama.'
        />
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => (
            <Link key={supplier.id} href={`/supplier/${supplier.id}`} className="block">
              <Card className="hover:border-cloud transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-navactive text-slate flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                      {supplier.supplierName.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <div>
                      <h3 className="text-slate text-[15px] font-bold">{supplier.supplierName}</h3>
                      <p className="text-muted text-[13px]">
                        {supplier.city}, {supplier.province}
                      </p>
                      <p className="text-slate mt-1 text-sm">
                        {supplier.whatsappNumber ?? supplier.phoneNumber ?? "Belum ada kontak"}
                      </p>
                    </div>
                  </div>
                  <div className="text-muted flex flex-col items-end gap-2 text-sm">
                    <p>{supplier._count.supplierProducts} produk ditawarkan</p>
                    <Badge tone={supplier.isActive ? "success" : "slate"}>
                      {supplier.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

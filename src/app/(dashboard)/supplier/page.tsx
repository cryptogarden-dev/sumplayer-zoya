import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listSuppliers } from "@/lib/server/repositories/supplier-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";

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
  const suppliers = await listSuppliers(session.user.businessId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Supplier"
          description="Kelola data supplier, kontak, area, dan jadwal pengiriman."
        />
        <Link
          href="/supplier/baru"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Tambah Supplier
        </Link>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState
          title="Belum ada supplier"
          description="Belum ada data supplier untuk bisnis ini. Form tambah supplier akan tersedia pada langkah berikutnya."
        />
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => (
            <Link key={supplier.id} href={`/supplier/${supplier.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {supplier.supplierName}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {supplier.city}, {supplier.province}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {supplier.whatsappNumber ?? supplier.phoneNumber ?? "Belum ada kontak"}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>{supplier._count.supplierProducts} produk ditawarkan</p>
                    <p className={supplier.isActive ? "text-emerald-600" : "text-slate-400"}>
                      {supplier.isActive ? "Aktif" : "Nonaktif"}
                    </p>
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

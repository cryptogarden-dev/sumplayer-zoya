import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { ONLY_OWNER_ADMIN } from "@/lib/auth/rbac";
import { listBusinessLocations } from "@/lib/server/repositories/business-location-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { LocationForm } from "@/components/lokasi/LocationForm";

export const metadata: Metadata = { title: "Lokasi/Cabang" };
export const dynamic = "force-dynamic";

/**
 * Pengaturan lokasi/cabang bisnis (pengembangan lanjutan disepakati
 * 2026-08-18 - lihat docs/BACKLOG.md #1). Khusus Pemilik/Admin (R26).
 * SENGAJA tidak dimasukkan ke navigasi utama (R25 membatasi 4 menu) -
 * diakses lewat menu profil, sama seperti Tarif Pajak.
 */
export default async function BusinessLocationsPage() {
  const session = await requireRole(ONLY_OWNER_ADMIN);
  const locations = await listBusinessLocations(session.user.businessId, true);

  return (
    <div>
      <PageHeader
        title="Lokasi/Cabang"
        description="Alamat tujuan default untuk halaman Bandingkan & Pesanan, agar tidak perlu diketik manual berulang."
      />

      <div className="space-y-6">
        {locations.length === 0 ? (
          <EmptyState
            title="Belum ada lokasi"
            description="Tambahkan lokasi pertama lewat form di bawah - akan otomatis jadi default."
          />
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <Card key={location.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{location.name}</h3>
                    <p className="text-sm text-slate-500">
                      {[location.district, location.city, location.province]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {location.address ? (
                      <p className="mt-1 text-xs text-slate-500">{location.address}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    {location.isDefault ? <p className="text-indigo-600">Default</p> : null}
                    <p className={location.isActive ? "text-emerald-600" : "text-slate-400"}>
                      {location.isActive ? "Aktif" : "Nonaktif"}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Tambah Lokasi</h2>
          <LocationForm hasExistingLocation={locations.length > 0} />
        </div>
      </div>
    </div>
  );
}

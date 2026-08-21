import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { ONLY_OWNER_ADMIN } from "@/lib/auth/rbac";
import { listTaxRates } from "@/lib/server/repositories/tax-rate-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { TaxRateForm } from "@/components/pajak/TaxRateForm";

export const metadata: Metadata = { title: "Tarif Pajak" };
export const dynamic = "force-dynamic";

/**
 * Tahap 3, langkah 7 (opsional - lihat `docs/TAHAP_3_UI_CHECKLIST.md`):
 * daftar & tambah tarif pajak. Khusus Pemilik/Admin (R07, R26) -
 * `requireRole` akan redirect ke `/unauthorized` untuk Staf. Halaman ini
 * SENGAJA tidak dimasukkan ke navigasi utama (Sidebar/BottomNav) karena
 * R25 membatasi menu utama hanya 4 item; diakses lewat menu profil.
 */
export default async function TaxRatesPage() {
  const session = await requireRole(ONLY_OWNER_ADMIN);
  const rates = await listTaxRates(session.user.businessId, true);

  return (
    <div>
      <PageHeader
        title="Tarif Pajak"
        description="Kelola tarif pajak yang dapat dipakai saat menambah penawaran produk."
      />

      <div className="space-y-6">
        {rates.length === 0 ? (
          <EmptyState
            title="Belum ada tarif pajak"
            description="Tambahkan tarif pajak lewat form di bawah agar bisa dipilih saat menambah penawaran."
          />
        ) : (
          <div className="space-y-3">
            {rates.map((rate) => (
              <Card key={rate.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{rate.name}</h3>
                    <p className="text-sm text-slate-500">{rate.ratePercent.toString()}%</p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    {rate.isDefault ? <p className="text-indigo-600">Default</p> : null}
                    <p className={rate.isActive ? "text-emerald-600" : "text-slate-400"}>
                      {rate.isActive ? "Aktif" : "Nonaktif"}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Tambah Tarif Pajak</h2>
          <TaxRateForm />
        </div>
      </div>
    </div>
  );
}

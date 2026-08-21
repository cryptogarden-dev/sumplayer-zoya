import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getSupplierById } from "@/lib/server/repositories/supplier-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { BackLink } from "@/components/ui/BackLink";
import { SupplierEditForm } from "@/components/supplier/SupplierEditForm";
import { SupplierStatusButton } from "@/components/supplier/SupplierStatusButton";
import { CreateOrderButton } from "@/components/supplier/CreateOrderButton";

export const metadata: Metadata = { title: "Detail Supplier" };
export const dynamic = "force-dynamic";

interface SupplierDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const session = await requireSession();
  const { id } = await params;
  const supplier = await getSupplierById(session.user.businessId, id);

  if (!supplier) {
    return (
      <div>
        <BackLink href="/supplier" label="Kembali ke Supplier" />
        <PageHeader title="Detail Supplier" />
        <EmptyState
          title="Supplier tidak ditemukan"
          description="Data mungkin sudah dihapus atau bukan milik bisnis ini."
        />
      </div>
    );
  }

  return (
    <div>
      <BackLink href="/supplier" label="Kembali ke Supplier" />
      <PageHeader
        title={supplier.supplierName}
        description="Ubah data supplier atau nonaktifkan."
      />

      <div className="space-y-6">
        <SupplierEditForm
          supplier={{
            id: supplier.id,
            supplierName: supplier.supplierName,
            companyName: supplier.companyName,
            contactName: supplier.contactName,
            phoneNumber: supplier.phoneNumber,
            whatsappNumber: supplier.whatsappNumber,
            email: supplier.email,
            address: supplier.address,
            province: supplier.province,
            city: supplier.city,
            district: supplier.district,
            postalCode: supplier.postalCode,
            operatingHours: supplier.operatingHours,
            leadTimeDaysMin: supplier.leadTimeDaysMin,
            leadTimeDaysMax: supplier.leadTimeDaysMax,
            paymentMethod: supplier.paymentMethod,
            paymentTermDays: supplier.paymentTermDays,
            notes: supplier.notes,
          }}
        />

        <SupplierStatusButton supplierId={supplier.id} isActive={supplier.isActive} />

        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Pesanan</h2>
          <CreateOrderButton supplierId={supplier.id} />
        </div>
      </div>
    </div>
  );
}

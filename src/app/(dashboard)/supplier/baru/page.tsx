import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { SupplierForm } from "@/components/supplier/SupplierForm";

export const metadata: Metadata = { title: "Tambah Supplier" };

export default function SupplierBaruPage() {
  return (
    <div>
      <BackLink href="/supplier" label="Kembali ke Supplier" />
      <PageHeader title="Tambah Supplier" description="Isi data supplier baru." />
      <SupplierForm />
    </div>
  );
}

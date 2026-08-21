import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { listProductCategories } from "@/lib/server/repositories/product-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { ProductForm } from "@/components/produk/ProductForm";

export const metadata: Metadata = { title: "Tambah Produk" };
export const dynamic = "force-dynamic";

export default async function ProdukBaruPage() {
  const session = await requireSession();
  const categories = await listProductCategories(session.user.businessId);

  return (
    <div>
      <BackLink href="/produk" label="Kembali ke Produk" />
      <PageHeader title="Tambah Produk" description="Isi data master produk baru." />
      <ProductForm
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      />
    </div>
  );
}

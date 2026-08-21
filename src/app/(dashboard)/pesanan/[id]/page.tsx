import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import {
  computeOrderTotal,
  getPurchaseOrderById,
} from "@/lib/server/repositories/purchase-order-repository";
import { listOffers } from "@/lib/server/repositories/supplier-product-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { BackLink } from "@/components/ui/BackLink";
import { PACKAGING_TYPE_LABELS } from "@/lib/format/units";
import { PesananWorkspace } from "@/components/pesanan/PesananWorkspace";

export const metadata: Metadata = { title: "Detail Pesanan" };
export const dynamic = "force-dynamic";

interface PesananDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PesananDetailPage({ params }: PesananDetailPageProps) {
  const session = await requireSession();
  const { id } = await params;
  const order = await getPurchaseOrderById(session.user.businessId, id);

  if (!order) {
    return (
      <div>
        <BackLink href="/pesanan" label="Kembali ke Pesanan" />
        <PageHeader title="Detail Pesanan" />
        <EmptyState
          title="Pesanan tidak ditemukan"
          description="Data mungkin sudah dihapus atau bukan milik bisnis ini."
        />
      </div>
    );
  }

  const availableOffers =
    order.status === "DRAFT"
      ? await listOffers(session.user.businessId, {
          supplierId: order.supplierId,
          // Produk yang sudah dinonaktifkan tidak boleh ditawarkan untuk
          // ditambahkan ke pesanan baru (docs/BACKLOG.md #5).
          activeProductOnly: true,
        })
      : [];

  return (
    <div>
      <BackLink href="/pesanan" label="Kembali ke Pesanan" />
      <PageHeader
        title={order.orderNumber ?? "Draft Pesanan"}
        description={`Supplier: ${order.supplier.supplierName}`}
      />

      <PesananWorkspace
        order={{
          id: order.id,
          status: order.status,
          orderNumber: order.orderNumber,
          supplierName: order.supplier.supplierName,
          supplierWhatsapp: order.supplier.whatsappNumber,
          supplierPhone: order.supplier.phoneNumber,
          notes: order.notes,
          cancelReason: order.cancelReason,
          paymentMethod: order.paymentMethod,
          items: order.items.map((item) => ({
            id: item.id,
            productName: item.supplierProduct.product.productName,
            brand: item.supplierProduct.product.brand,
            variant: item.supplierProduct.product.variant,
            packageTypeLabel: PACKAGING_TYPE_LABELS[item.supplierProduct.packageType],
            packageQty: item.packageQty.toString(),
            totalPackageContent: item.supplierProduct.totalPackageContent.toString(),
            baseUnit: item.supplierProduct.baseUnit,
            pricePerPackageSnapshot: item.pricePerPackageSnapshot.toString(),
            lineSubtotal: item.lineSubtotal.toString(),
            availabilityStatus: item.availabilityStatus,
            confirmedPackageQty: item.confirmedPackageQty?.toString() ?? null,
          })),
        }}
        orderTotal={computeOrderTotal(order).toString()}
        availableOffers={availableOffers.map((offer) => ({
          id: offer.id,
          productName: offer.product.productName,
          brand: offer.product.brand,
          variant: offer.product.variant,
          packageTypeLabel: PACKAGING_TYPE_LABELS[offer.packageType],
          pricePerPackage: offer.prices[0]?.pricePerPackage.toString() ?? "0",
          category: offer.product.category
            ? { id: offer.product.category.id, name: offer.product.category.name }
            : null,
        }))}
      />
    </div>
  );
}

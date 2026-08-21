import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import {
  listPurchaseOrders,
  computeOrderTotal,
} from "@/lib/server/repositories/purchase-order-repository";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PesananList } from "@/components/pesanan/PesananList";

export const metadata: Metadata = { title: "Pesanan" };
export const dynamic = "force-dynamic";

/**
 * Daftar pesanan (R16, pengembangan lanjutan disepakati 2026-08-18 -
 * lihat docs/BACKLOG.md #2). Draft dibuat dari halaman detail Supplier
 * ("Buat Pesanan").
 */
export default async function PesananPage() {
  const session = await requireSession();
  const orders = await listPurchaseOrders(session.user.businessId);

  return (
    <div>
      <PageHeader
        title="Pesanan"
        description="Kelola draft pesanan ke supplier, kirim lewat WhatsApp, dan konfirmasi ketersediaan."
      />

      {orders.length === 0 ? (
        <EmptyState
          title="Belum ada pesanan"
          description="Buat draft pesanan dari halaman detail supplier (tombol 'Buat Pesanan')."
        />
      ) : (
        <PesananList
          orders={orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            supplierName: order.supplier.supplierName,
            itemCount: order.items.length,
            total: computeOrderTotal(order).toNumber(),
            status: order.status,
            createdAt: order.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}

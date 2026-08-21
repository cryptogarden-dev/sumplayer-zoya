"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/format/currency";
import { formatTanggalIndonesia } from "@/lib/format/date";
import { PURCHASE_ORDER_STATUS_LABELS } from "@/lib/format/orders";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "text-slate-500",
  DIPESAN: "text-amber-600",
  DIKONFIRMASI: "text-emerald-600",
  DIKIRIM: "text-emerald-600",
  DITERIMA: "text-emerald-600",
  DIBATALKAN: "text-red-600",
};

/** Status yang boleh dihapus permanen langsung (docs/BACKLOG.md #5) - yang
 * lain (DIPESAN/DIKONFIRMASI/dst) harus dibatalkan dulu lewat halaman
 * detail pesanan, baru bisa dihapus. */
const DELETABLE_STATUSES = new Set(["DRAFT", "DIBATALKAN"]);

export interface PesananListItem {
  id: string;
  orderNumber: string | null;
  supplierName: string;
  itemCount: number;
  total: number;
  status: string;
  createdAt: string;
}

/**
 * Daftar pesanan (docs/BACKLOG.md #5): tampilkan tanggal dibuat supaya
 * jelas mana pesanan lama, dan sediakan tombol hapus permanen untuk
 * draft/pesanan yang dibatalkan supaya tidak menumpuk terus.
 */
export function PesananList({ orders }: { orders: PesananListItem[] }) {
  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <PesananListCard key={order.id} order={order} />
      ))}
    </div>
  );
}

function PesananListCard({ order }: { order: PesananListItem }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = DELETABLE_STATUSES.has(order.status);

  async function handleDelete(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (
      !window.confirm(
        "Hapus pesanan ini secara PERMANEN? Data yang sudah dihapus tidak bisa dikembalikan.",
      )
    ) {
      return;
    }

    setError(null);
    setIsDeleting(true);
    const response = await fetch(`/api/purchase-orders/${order.id}`, { method: "DELETE" });
    setIsDeleting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Gagal menghapus pesanan.");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="relative transition-shadow hover:shadow-md">
      <Link href={`/pesanan/${order.id}`} className="block">
        <div className="flex flex-wrap items-start justify-between gap-3 pr-16">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {order.orderNumber ?? "Draft"} - {order.supplierName}
            </h3>
            <p className="text-sm text-slate-500">
              {order.itemCount} produk · {formatTanggalIndonesia(order.createdAt)}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-slate-900">{formatRupiah(order.total)}</p>
            <p className={STATUS_COLOR[order.status] ?? "text-slate-500"}>
              {PURCHASE_ORDER_STATUS_LABELS[
                order.status as keyof typeof PURCHASE_ORDER_STATUS_LABELS
              ] ?? order.status}
            </p>
          </div>
        </div>
      </Link>

      {canDelete ? (
        <button
          type="button"
          disabled={isDeleting}
          onClick={handleDelete}
          className="absolute top-5 right-5 text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
        >
          {isDeleting ? "Menghapus..." : "Hapus"}
        </button>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </Card>
  );
}

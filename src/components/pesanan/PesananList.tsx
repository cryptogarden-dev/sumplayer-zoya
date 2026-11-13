"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatRupiah } from "@/lib/format/currency";
import { formatTanggalIndonesia } from "@/lib/format/date";
import { PURCHASE_ORDER_STATUS_LABELS } from "@/lib/format/orders";

/** Warna pill status (docs/design/DESIGN_SPEC.md §5): selesai pakai hijau
 * brand Zoya, diproses kuning, batal merah, draft netral. */
const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "slate",
  DIPESAN: "amber",
  DIKONFIRMASI: "success",
  DIKIRIM: "success",
  DITERIMA: "success",
  DIBATALKAN: "red",
};

/** Tab filter status (docs/design/DESIGN_SPEC.md §5) — filter di sisi
 * klien dari daftar yang sudah diambil, tanpa fetch tambahan. Tab aktif:
 * bg slate teks putih; tidak aktif: putih teks mist. */
const TABS: { key: string; label: string; statuses: string[] | null }[] = [
  { key: "semua", label: "Semua", statuses: null },
  { key: "diproses", label: "Diproses", statuses: ["DRAFT", "DIPESAN", "DIKONFIRMASI"] },
  { key: "dikirim", label: "Dikirim", statuses: ["DIKIRIM"] },
  { key: "selesai", label: "Selesai", statuses: ["DITERIMA"] },
  { key: "dibatalkan", label: "Dibatalkan", statuses: ["DIBATALKAN"] },
];

/** Status yang boleh dihapus permanen langsung (docs/BACKLOG.md #5) -
 * DRAFT/DIBATALKAN kapan saja, DITERIMA juga boleh (stok toko yang dulu
 * ditambahkan dari pesanan itu dikurangi lagi). Yang lain
 * (DIPESAN/DIKONFIRMASI/DIKIRIM) harus dibatalkan dulu (DRAFT/DIPESAN)
 * atau diterima dulu (DIKONFIRMASI/DIKIRIM) lewat halaman detail
 * pesanan, baru bisa dihapus. */
const DELETABLE_STATUSES = new Set(["DRAFT", "DIBATALKAN", "DITERIMA"]);

/** Pesan konfirmasi hapus — untuk DITERIMA disebut juga konsekuensinya
 * ke stok toko, supaya tidak kaget stoknya berkurang. */
export function deleteOrderConfirmMessage(status: string): string {
  if (status === "DITERIMA") {
    return (
      "Hapus pesanan ini secara PERMANEN? Stok toko yang dulu ditambahkan dari pesanan ini " +
      "akan dikurangi lagi, dan catatan penerimaan barangnya ikut terhapus. " +
      "Data yang sudah dihapus tidak bisa dikembalikan."
    );
  }
  return "Hapus pesanan ini secara PERMANEN? Data yang sudah dihapus tidak bisa dikembalikan.";
}

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
  const [activeTab, setActiveTab] = useState("semua");
  const tab = TABS.find((t) => t.key === activeTab) ?? TABS[0]!;
  const visibleOrders =
    tab.statuses === null ? orders : orders.filter((order) => tab.statuses!.includes(order.status));

  return (
    <div className="space-y-3">
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Filter status pesanan"
      >
        {TABS.map((t) => {
          const count =
            t.statuses === null
              ? orders.length
              : orders.filter((order) => t.statuses!.includes(order.status)).length;
          const active = t.key === activeTab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(t.key)}
              className={
                active
                  ? "bg-slate inline-flex min-h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold text-white"
                  : "border-divider text-mist hover:text-slate inline-flex min-h-9 shrink-0 items-center rounded-full border bg-white px-3.5 text-sm font-medium"
              }
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>
      {visibleOrders.length === 0 ? (
        <p className="text-muted py-8 text-center text-sm">Tidak ada pesanan pada tab ini.</p>
      ) : (
        visibleOrders.map((order) => <PesananListCard key={order.id} order={order} />)
      )}
    </div>
  );
}

function PesananListCard({ order }: { order: PesananListItem }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const canDelete = DELETABLE_STATUSES.has(order.status);

  async function handleDelete() {
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
    <>
      <Card className="hover:border-cloud relative transition-colors">
        <Link href={`/pesanan/${order.id}`} className="block">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-16">
            <div>
              <h3 className="text-slate text-[15px] font-bold">
                {order.orderNumber ?? "Draft"} - {order.supplierName}
              </h3>
              <p className="text-muted text-[13px]">
                {order.itemCount} produk · {formatTanggalIndonesia(order.createdAt)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              <p className="text-slate font-semibold">{formatRupiah(order.total)}</p>
              <Badge tone={STATUS_TONE[order.status] ?? "slate"}>
                {PURCHASE_ORDER_STATUS_LABELS[
                  order.status as keyof typeof PURCHASE_ORDER_STATUS_LABELS
                ] ?? order.status}
              </Badge>
            </div>
          </div>
        </Link>

        {canDelete ? (
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setConfirmDeleteOpen(true)}
            className="absolute top-5 right-5 text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
          >
            {isDeleting ? "Menghapus..." : "Hapus"}
          </button>
        ) : null}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </Card>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Hapus Pesanan Permanen"
        message={deleteOrderConfirmMessage(order.status)}
        onConfirm={handleDelete}
        isBusy={isDeleting}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format/currency";
import type { ComparisonRowDto } from "@/components/perbandingan/types";

/**
 * Panel "PENAWARAN TERBAIK" (docs/design/DESIGN_SPEC.md §5): kartu gelap
 * slate dengan total besar putih + tombol "Buat Pesanan" bg kunyit.
 * Tombolnya benar-benar bekerja — memakai alur yang sudah ada
 * (`ProductQuickOrderSheet`): sambung ke draft pesanan supplier ini bila
 * ada, kalau tidak buat draft baru, tambahkan produk yang dibandingkan
 * (jumlah sesuai hasil Bandingkan), lalu arahkan ke halaman pesanan.
 */
export function BestOfferPanel({
  row,
  productName,
}: {
  row: ComparisonRowDto;
  productName: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = row.money.totalCost ?? row.money.totalCostBeforeShipping;
  const shippingUnknown = row.money.totalCost === null;

  async function handleCreateOrder() {
    setError(null);
    setIsSubmitting(true);
    try {
      const draftRes = await fetch(
        `/api/purchase-orders?supplierId=${row.supplier.id}&status=DRAFT`,
      );
      if (!draftRes.ok) throw new Error("Gagal memeriksa draft pesanan supplier ini.");
      const draftData = (await draftRes.json()) as { orders: { id: string }[] };
      let orderId = draftData.orders[0]?.id;

      if (!orderId) {
        const createRes = await fetch("/api/purchase-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierId: row.supplier.id }),
        });
        const createPayload = (await createRes.json().catch(() => null)) as {
          order?: { id: string };
          error?: string;
        } | null;
        if (!createRes.ok || !createPayload?.order) {
          throw new Error(createPayload?.error ?? "Gagal membuat pesanan baru.");
        }
        orderId = createPayload.order.id;
      }

      const itemRes = await fetch(`/api/purchase-orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierProductId: row.offerId,
          packageQty: Number(row.purchase.packagesToBuy),
        }),
      });
      if (!itemRes.ok) {
        const payload = (await itemRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Gagal menambahkan produk ke pesanan.");
      }

      router.push(`/pesanan/${orderId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Terjadi kesalahan. Coba lagi.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-slate rounded-[20px] p-6 text-white lg:sticky lg:top-24 lg:self-start">
      <p className="text-xs font-semibold tracking-[2px] text-white/60">PENAWARAN TERBAIK</p>
      <h3 className="font-display mt-3 text-2xl font-semibold">{row.supplier.name}</h3>
      <p className="mt-1 text-sm text-white/70">
        {row.supplier.city}, {row.supplier.province}
      </p>
      <p className="mt-1 text-sm text-white/70">{productName}</p>
      <p className="mt-5 text-[44px] leading-none font-bold">
        {total === null ? "—" : formatRupiah(total)}
      </p>
      <p className="mt-2 text-sm text-white/70">
        {shippingUnknown ? "Belum termasuk ongkir" : "Termasuk ongkir"}
        {row.money.finalPricePerBaseUnit !== null
          ? ` · ${formatRupiah(row.money.finalPricePerBaseUnit)}/satuan`
          : ""}
      </p>
      <button
        type="button"
        onClick={handleCreateOrder}
        disabled={isSubmitting}
        className="bg-kunyit hover:bg-kunyit/90 mt-6 flex min-h-[46px] w-full items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Membuat pesanan..." : "Buat Pesanan"}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-red-200" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

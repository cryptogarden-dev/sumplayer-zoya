"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatRupiah } from "@/lib/format/currency";

/**
 * Tombol Hapus di tiap baris Penjualan — untuk penjualan yang kepencet
 * / salah catat. Selalu minta konfirmasi dulu (dialog), karena hapusnya
 * permanen: riwayat penjualan hilang dan stok produk dikembalikan
 * sejumlah yang terjual.
 */
export function DeleteSaleButton({
  movementId,
  productName,
  quantityLabel,
  totalAmount,
}: {
  movementId: string;
  productName: string;
  quantityLabel: string;
  totalAmount: number | null;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setIsBusy(true);
    try {
      const response = await fetch(`/api/sales/${movementId}`, { method: "DELETE" });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          body !== null && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : "Gagal menghapus penjualan.";
        setError(message);
        return;
      }
      router.refresh();
    } catch {
      setError("Gagal menghapus penjualan. Coba lagi.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={isBusy}
        onClick={() => setConfirmOpen(true)}
        className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
      >
        Hapus
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus penjualan ini?"
        message={`Penjualan ${productName} (${quantityLabel}${totalAmount !== null ? `, ${formatRupiah(totalAmount)}` : ""}) akan dihapus permanen dan stok produk dikembalikan sejumlah yang terjual.`}
        confirmLabel="Ya, Hapus"
        onConfirm={handleDelete}
        isBusy={isBusy}
      />
    </>
  );
}

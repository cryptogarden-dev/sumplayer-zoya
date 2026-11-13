"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Aksi per baris penawaran supplier (docs/BACKLOG.md #5): nonaktifkan/
 * aktifkan (aman kapan saja, bisa dibalik) dan hapus permanen (server
 * menolak dengan pesan jelas kalau penawaran ini sudah pernah dipesan -
 * gunakan nonaktifkan untuk kasus itu).
 */
export function OfferActions({ offerId, isActive }: { offerId: string; isActive: boolean }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  async function handleToggle() {
    setError(null);
    setIsSubmitting(true);
    const response = await fetch(`/api/supplier-products/${offerId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      setError("Gagal mengubah status penawaran.");
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    setError(null);
    setIsSubmitting(true);
    const response = await fetch(`/api/supplier-products/${offerId}`, { method: "DELETE" });
    setIsSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Gagal menghapus penawaran.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleToggle}
        className="text-slate text-xs font-semibold hover:underline disabled:opacity-60"
      >
        {isActive ? "Nonaktifkan" : "Aktifkan"}
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => setConfirmDeleteOpen(true)}
        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
      >
        Hapus Permanen
      </button>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Hapus Penawaran"
        message="Hapus penawaran ini secara PERMANEN? Data yang sudah dihapus tidak bisa dikembalikan."
        onConfirm={handleDelete}
        isBusy={isSubmitting}
      />
    </div>
  );
}

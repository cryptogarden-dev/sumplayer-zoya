"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * Hapus produk PERMANEN (docs/BACKLOG.md #5) - berbeda dari
 * `ProductStatusButton` (nonaktifkan/aktifkan). Server akan menolak
 * (pesan error ditampilkan apa adanya) jika produk ini sudah pernah
 * dipakai di pesanan manapun, supaya riwayat pesanan lama tidak rusak -
 * dalam kasus itu pengguna diarahkan memakai tombol Nonaktifkan.
 */
export function ProductDeleteButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (
      !window.confirm(
        "Hapus produk ini secara PERMANEN? Data yang sudah dihapus tidak bisa dikembalikan.",
      )
    ) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const response = await fetch(`/api/products/${productId}`, { method: "DELETE" });
    setIsSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Gagal menghapus produk.");
      return;
    }

    router.push("/produk");
    router.refresh();
  }

  return (
    <div>
      <Button variant="danger" disabled={isSubmitting} onClick={handleClick}>
        {isSubmitting ? "Menghapus..." : "Hapus Produk Permanen"}
      </Button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

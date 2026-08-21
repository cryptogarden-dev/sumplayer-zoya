"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * Mulai draft pesanan baru untuk supplier ini (satu draft = satu
 * supplier, disepakati 2026-08-18 - lihat docs/BACKLOG.md #2). Setelah
 * dibuat, langsung diarahkan ke halaman pesanan untuk menambah produk.
 */
export function CreateOrderButton({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId }),
    });

    const payload = (await response.json().catch(() => null)) as {
      order?: { id: string };
      error?: string;
    } | null;

    if (!response.ok || !payload?.order) {
      setIsSubmitting(false);
      setError(payload?.error ?? "Gagal membuat draft pesanan.");
      return;
    }

    router.push(`/pesanan/${payload.order.id}`);
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={isSubmitting}>
        {isSubmitting ? "Membuat draft..." : "Buat Pesanan"}
      </Button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

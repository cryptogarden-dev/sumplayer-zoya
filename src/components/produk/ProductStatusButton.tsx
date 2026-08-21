"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ProductStatusButton({
  productId,
  isActive,
}: {
  productId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/products/${productId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError("Gagal mengubah status produk.");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <Button
        variant={isActive ? "danger" : "secondary"}
        disabled={isSubmitting}
        onClick={handleClick}
      >
        {isSubmitting ? "Memproses..." : isActive ? "Nonaktifkan Produk" : "Aktifkan Produk"}
      </Button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function SupplierStatusButton({
  supplierId,
  isActive,
}: {
  supplierId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/suppliers/${supplierId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError("Gagal mengubah status supplier.");
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
        {isSubmitting ? "Memproses..." : isActive ? "Nonaktifkan Supplier" : "Aktifkan Supplier"}
      </Button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

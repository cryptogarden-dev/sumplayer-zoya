"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toBaseQty, toDisplayQty } from "@/lib/domain/stock/package-qty";

interface StockAdjusterProps {
  productId: string;
  /** Stok saat ini dalam satuan dasar. */
  stockQtyBase: number;
  /** Satuan tampil, mis. "Renceng" / "kg" / "pcs". */
  displayUnit: string;
  /** Satuan dasar per satuan tampil (10 untuk 1 renceng = 10 pcs). */
  packageContent: number;
  /** Baris kecil di bawah kontrol, mis. "30 pcs" / "2 Karung". */
  stockSubline: string | null;
}

/**
 * Atur stok langsung dari tabel Stok Toko (Stok Fleksibel, 2026-11-19):
 * tombol (-) / (+) melangkah 1 satuan tampil, atau ketik jumlahnya
 * langsung lalu Enter / klik di luar. Perubahan tersimpan lewat PATCH
 * /api/products/[id]/stock dan total persediaan ikut terbarui. Stok
 * tidak bisa negatif — tombol (-) mati di 0 dan input dijaga >= 0.
 */
export function StockAdjuster({
  productId,
  stockQtyBase,
  displayUnit,
  packageContent,
  stockSubline,
}: StockAdjusterProps) {
  const router = useRouter();
  const displayQty = toDisplayQty(stockQtyBase, packageContent);
  const [draft, setDraft] = useState(String(displayQty));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ikuti stok terbaru dari server sesudah refresh (mis. habis jual).
  useEffect(() => {
    setDraft(String(displayQty));
  }, [displayQty]);

  async function save(nextDisplayQty: number) {
    if (!Number.isFinite(nextDisplayQty) || nextDisplayQty < 0) {
      setError("Stok harus angka 0 atau lebih.");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/products/${productId}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockQty: toBaseQty(nextDisplayQty, packageContent),
        unitLabel: displayUnit,
        unitDelta: Math.round((nextDisplayQty - displayQty) * 10000) / 10000,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Gagal menyimpan stok. Coba lagi.");
      setDraft(String(displayQty));
      return;
    }
    router.refresh();
  }

  function commitDraft() {
    const parsed = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(parsed)) {
      setDraft(String(displayQty));
      return;
    }
    if (parsed === displayQty) return;
    void save(parsed);
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => void save(displayQty - 1)}
          disabled={saving || displayQty <= 0}
          aria-label="Kurangi stok"
          className="border-divider hover:border-slate h-7 w-7 rounded-lg border bg-white text-base font-semibold text-slate-700 disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={draft}
          disabled={saving}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitDraft();
            if (event.key === "Escape") setDraft(String(displayQty));
          }}
          onBlur={commitDraft}
          aria-label={`Stok dalam ${displayUnit}`}
          className="border-divider focus:border-slate w-20 rounded-lg border bg-white px-2 py-1 text-center text-sm font-semibold text-slate-900 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void save(displayQty + 1)}
          disabled={saving}
          aria-label="Tambah stok"
          className="border-divider hover:border-slate h-7 w-7 rounded-lg border bg-white text-base font-semibold text-slate-700 disabled:opacity-40"
        >
          +
        </button>
        <span className="text-sm font-semibold text-slate-900">{displayUnit}</span>
      </span>
      {stockSubline ? <span className="text-xs text-slate-500">{stockSubline}</span> : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}

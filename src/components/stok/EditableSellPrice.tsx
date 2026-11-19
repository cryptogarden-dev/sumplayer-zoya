"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format/currency";

interface EditableSellPriceProps {
  productId: string;
  initialValue: number | null;
  unitLabel: string;
  /**
   * Satuan dasar per satuan tampil (mis. 10 untuk Kopi Good Day:
   * 1 renceng = 10 pcs). Input menampilkan/menyimpan harga per satuan
   * tampil (Rp13.500/renceng), API tetap menerima harga per satuan
   * dasar (Rp1.350/pcs). Default 1 (harga tampil = harga per dasar).
   */
  packageContent?: number;
}

/**
 * Harga jual yang bisa diedit langsung dari tabel Stok Toko.
 * Klik harga (atau "—") untuk mengubahnya, Simpan untuk menyimpan lewat
 * PATCH /api/products/[id]/sell-price. Kosongkan untuk menghapus harga
 * jual. Enter menyimpan, Esc membatalkan. Harga beli tidak bisa diedit
 * di sini — asalnya dari penawaran supplier termurah.
 */
export function EditableSellPrice({
  productId,
  initialValue,
  unitLabel,
  packageContent = 1,
}: EditableSellPriceProps) {
  const router = useRouter();
  const [value, setValue] = useState<number | null>(initialValue);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Harga tampil (per satuan tampil) dari harga per satuan dasar. */
  const displayValue = value === null ? null : value * packageContent;

  function startEditing() {
    setDraft(displayValue === null ? "" : String(displayValue));
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
  }

  async function submit(nextValue: number | null) {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/products/${productId}/sell-price`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellPricePerBaseUnit: nextValue }),
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Gagal menyimpan harga jual. Coba lagi.");
      return;
    }
    setValue(nextValue);
    setEditing(false);
    router.refresh();
  }

  async function save() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      await submit(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Harga jual harus angka 0 atau lebih.");
      return;
    }
    // Konversi kembali ke harga per satuan dasar (dibulatkan ke rupiah,
    // karena kolom harga jual memakai 2 desimal).
    await submit(Math.round((parsed / packageContent) * 100) / 100);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        title="Klik untuk ubah harga jual"
        className="group inline-flex items-baseline gap-1 text-slate-600 hover:text-slate-900"
      >
        <span>{displayValue === null ? "—" : `${formatRupiah(displayValue)}/${unitLabel}`}</span>
        <span className="text-xs text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
          Ubah
        </span>
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1">
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={draft}
          autoFocus
          disabled={saving}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void save();
            if (event.key === "Escape") cancelEditing();
          }}
          placeholder="Rp"
          aria-label="Harga jual baru"
          className="border-divider focus:border-slate w-28 rounded-lg border bg-white px-2 py-1 text-sm text-slate-900 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="bg-slate rounded-lg px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {saving ? "…" : "Simpan"}
        </button>
        <button
          type="button"
          onClick={cancelEditing}
          disabled={saving}
          className="border-divider rounded-lg border bg-white px-2 py-1 text-xs font-medium text-slate-600"
        >
          Batal
        </button>
      </span>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}

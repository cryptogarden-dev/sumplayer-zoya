"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format/currency";

interface EditableEceranPriceProps {
  productId: string;
  /** Harga eceran per satuan dasar saat ini (null = belum diatur). */
  initialValue: number | null;
  /** Label satuan dasar, mis. "pcs". */
  unitLabel: string;
}

/**
 * Harga jual eceran yang bisa diedit langsung dari tabel Stok Toko
 * (Stok Fleksibel, 2026-11-19). Pola yang sama dengan EditableSellPrice:
 * klik untuk mengubah, Simpan lewat PATCH /api/products/[id]/sell-price
 * (field eceran), kosongkan untuk menghapus harga eceran. Hanya dipakai
 * untuk produk hitungan (COUNT) — produk timbangan tidak punya eceran.
 */
export function EditableEceranPrice({
  productId,
  initialValue,
  unitLabel,
}: EditableEceranPriceProps) {
  const router = useRouter();
  const [value, setValue] = useState<number | null>(initialValue);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(value === null ? "" : String(value));
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
      body: JSON.stringify({ eceranPricePerBaseUnit: nextValue }),
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Gagal menyimpan harga eceran. Coba lagi.");
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
      setError("Harga eceran harus angka 0 atau lebih.");
      return;
    }
    await submit(parsed);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        title={value === null ? "Klik untuk atur harga eceran" : "Klik untuk ubah harga eceran"}
        className="group inline-flex items-baseline gap-1 text-slate-500 hover:text-slate-900"
      >
        <span>{value === null ? "＋ Eceran" : `Eceran ${formatRupiah(value)}/${unitLabel}`}</span>
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
          aria-label="Harga eceran baru"
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

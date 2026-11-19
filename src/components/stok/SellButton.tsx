"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatRupiah } from "@/lib/format/currency";
import { toDisplayQty } from "@/lib/domain/stock/package-qty";

export interface SellProductData {
  id: string;
  productName: string;
  /** Stok saat ini dalam satuan dasar. */
  stockQtyBase: number;
  /** Satuan tampil stok, mis. "Renceng" / "kg" / "pcs". */
  displayUnit: string;
  /** Satuan dasar per satuan tampil (10 untuk 1 renceng = 10 pcs). */
  displayPackageContent: number;
  /** Label satuan dasar, mis. "pcs" / "kg". */
  baseUnitLabel: string;
  /** Label kemasan termurah, mis. "Renceng" / "Karung" / "Pak". */
  packageLabel: string | null;
  /** Isi kemasan termurah dalam satuan dasar (10 / 5 / 1). */
  packageContent: number | null;
  /** Harga jual per satuan dasar (null = belum diatur). */
  sellPerBase: number | null;
  /** Harga jual eceran per satuan dasar (null = tidak ada). */
  eceranPerBase: number | null;
}

interface SellOption {
  key: "package" | "base";
  label: string;
  /** Harga per satuan yang dipilih. */
  price: number;
  /** Stok maksimal yang bisa dijual dalam satuan ini. */
  maxQty: number;
}

/**
 * Tombol "Jual" + dialog penjualan di tabel Stok Toko (Stok Fleksibel,
 * 2026-11-19). Pilih satuan (per kemasan / per satuan dasar), jumlah,
 * total dihitung otomatis, lalu "Catat Penjualan" mengurangi stok dan
 * mencatat penjualannya lewat POST /api/products/[id]/sell. Renceng
 * dan pcs memakai satu persediaan: jual 1 renceng = stok berkurang
 * 10 pcs; jual 2 pcs = stok berkurang 2 pcs. Stok tidak bisa kurang
 * dari yang dijual.
 */
export function SellButton({ product }: { product: SellProductData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unitKey, setUnitKey] = useState<"package" | "base">("package");
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const options: SellOption[] = [];
  if (
    product.packageContent !== null &&
    product.packageContent > 1 &&
    product.packageLabel !== null &&
    product.sellPerBase !== null
  ) {
    options.push({
      key: "package",
      label: product.packageLabel,
      price: product.sellPerBase * product.packageContent,
      maxQty: Math.floor(product.stockQtyBase / product.packageContent),
    });
  }
  const basePrice = product.eceranPerBase ?? product.sellPerBase;
  if (basePrice !== null) {
    options.push({
      key: "base",
      label: product.baseUnitLabel,
      price: basePrice,
      maxQty: Math.floor(product.stockQtyBase),
    });
  }

  const selected = options.find((option) => option.key === unitKey) ?? options[0] ?? null;
  const total = selected === null ? 0 : qty * selected.price;
  const noPrice = options.length === 0;
  const outOfStock = product.stockQtyBase <= 0;

  function openDialog() {
    setUnitKey(options[0]?.key ?? "base");
    setQty(1);
    setError(null);
    setSuccess(null);
    setOpen(true);
  }

  function clampQty(next: number): number {
    if (!Number.isFinite(next)) return 1;
    const max = selected?.maxQty ?? 0;
    return Math.min(Math.max(Math.floor(next), 1), Math.max(max, 1));
  }

  async function submitSale() {
    if (selected === null) return;
    if (qty < 1 || qty > selected.maxQty) {
      setError(
        selected.maxQty <= 0
          ? "Stok tidak cukup untuk penjualan ini."
          : `Jumlah maksimal ${selected.maxQty} ${selected.label}.`,
      );
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/products/${product.id}/sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unit: selected.key,
        quantity: qty,
        unitLabel: selected.label,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Gagal mencatat penjualan. Coba lagi.");
      return;
    }
    const payload = (await response.json().catch(() => null)) as {
      stockQty?: number;
      totalAmount?: number;
    } | null;
    const newStockDisplay = toDisplayQty(
      payload?.stockQty ?? product.stockQtyBase,
      product.displayPackageContent,
    );
    setSuccess(
      `Terjual ${qty} ${selected.label} — ${formatRupiah(total)}. ` +
        `Sisa stok ${newStockDisplay} ${product.displayUnit}.`,
    );
    router.refresh();
  }

  return (
    <>
      <Button
        variant="secondary"
        disabled={noPrice || outOfStock}
        title={
          noPrice
            ? "Atur harga jual dulu sebelum menjual"
            : outOfStock
              ? "Stok habis"
              : "Jual produk ini"
        }
        onClick={openDialog}
      >
        Jual
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title={`Jual — ${product.productName}`}>
        <p className="text-sm text-slate-600">
          Stok saat ini: {toDisplayQty(product.stockQtyBase, product.displayPackageContent)}{" "}
          {product.displayUnit}
          {product.displayPackageContent > 1
            ? ` (${product.stockQtyBase} ${product.baseUnitLabel})`
            : ""}
        </p>

        {options.length > 1 ? (
          <div className="mt-4 flex gap-2">
            {options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setUnitKey(option.key);
                  setQty(1);
                  setError(null);
                }}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  selected?.key === option.key
                    ? "border-slate bg-slate text-white"
                    : "border-divider text-slate bg-white"
                }`}
              >
                Per {option.label} · {formatRupiah(option.price)}
              </button>
            ))}
          </div>
        ) : null}

        {selected === null ? (
          <p className="mt-4 text-sm text-red-600">
            Harga jual produk ini belum diatur, jadi belum bisa dijual.
          </p>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty((current) => clampQty(current - 1))}
                disabled={saving || qty <= 1}
                aria-label="Kurangi jumlah"
                className="border-divider h-9 w-9 rounded-lg border bg-white text-lg font-semibold text-slate-700 disabled:opacity-40"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max={selected.maxQty}
                step="1"
                inputMode="numeric"
                value={qty}
                disabled={saving}
                onChange={(event) => setQty(clampQty(Number(event.target.value)))}
                aria-label={`Jumlah dalam ${selected.label}`}
                className="border-divider focus:border-slate w-20 rounded-lg border bg-white px-2 py-2 text-center text-sm font-semibold text-slate-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQty((current) => clampQty(current + 1))}
                disabled={saving || qty >= selected.maxQty}
                aria-label="Tambah jumlah"
                className="border-divider h-9 w-9 rounded-lg border bg-white text-lg font-semibold text-slate-700 disabled:opacity-40"
              >
                +
              </button>
              <span className="text-sm font-semibold text-slate-900">{selected.label}</span>
              <span className="ml-auto text-sm text-slate-600">
                {formatRupiah(selected.price)}/{selected.label}
              </span>
            </div>
            <p className="mt-3 text-base font-semibold text-slate-900">
              Total: {formatRupiah(total)}
            </p>
            {selected.key === "package" ? (
              <p className="mt-1 text-xs text-slate-500">
                1 {selected.label} = {product.packageContent} {product.baseUnitLabel} — stok
                berkurang {qty * (product.packageContent ?? 1)} {product.baseUnitLabel}.
              </p>
            ) : null}
          </>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}
        {success ? <p className="mt-3 text-sm font-medium text-emerald-600">{success}</p> : null}

        <div className="mt-5 flex gap-3">
          <Button
            disabled={saving || selected === null || selected.maxQty <= 0}
            onClick={() => void submitSale()}
          >
            {saving ? "Mencatat..." : "Catat Penjualan"}
          </Button>
          <Button variant="secondary" disabled={saving} onClick={() => setOpen(false)}>
            Tutup
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}

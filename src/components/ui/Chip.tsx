"use client";

import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/**
 * Tombol pil untuk filter bergaya marketplace (kategori, dsb). Dipakai di
 * halaman Produk dan panel tambah produk pada Pesanan agar konsisten.
 */
export function Chip({ active, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700",
        className,
      )}
      {...props}
    />
  );
}

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
        "focus-visible:outline-slate inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        active
          ? "border-slate bg-slate text-white"
          : "border-divider text-mist hover:border-cloud hover:text-slate bg-white",
        className,
      )}
      {...props}
    />
  );
}

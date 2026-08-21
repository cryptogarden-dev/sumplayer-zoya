import type { ReactNode } from "react";
import { NavIcon } from "@/components/app-shell/NavIcon";

interface EmptyStateProps {
  title: string;
  description: string;
  footnote?: ReactNode;
}

/**
 * Empty state generik. Sengaja TIDAK menyertakan tombol aksi apa pun,
 * karena pada Tahap 1 modul-modul terkait (Supplier/Produk/Bandingkan/
 * Pesanan) belum diimplementasikan. Menampilkan tombol yang terlihat aktif
 * namun tidak berfungsi dilarang secara eksplisit oleh instruksi tugas ini.
 */
export function EmptyState({ title, description, footnote }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <NavIcon name="inbox" className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {footnote ? <div className="mt-4 text-xs text-slate-400">{footnote}</div> : null}
    </div>
  );
}

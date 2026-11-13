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
    <div className="border-cloud flex flex-col items-center justify-center rounded-[20px] border border-dashed bg-white px-6 py-16 text-center">
      <span className="bg-navactive text-mist flex h-12 w-12 items-center justify-center rounded-full">
        <NavIcon name="inbox" className="h-6 w-6" />
      </span>
      <h2 className="text-slate mt-4 text-base font-semibold">{title}</h2>
      <p className="text-muted mt-1 max-w-sm text-sm">{description}</p>
      {footnote ? <div className="text-muted mt-4 text-xs">{footnote}</div> : null}
    </div>
  );
}

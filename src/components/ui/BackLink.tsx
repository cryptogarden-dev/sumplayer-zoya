import Link from "next/link";
import { NavIcon } from "@/components/app-shell/NavIcon";

/**
 * Tautan "Kembali" dengan ikon panah (permintaan pengguna 2026-08-20) -
 * dipasang di halaman detail/tambah yang sebelumnya tidak punya jalan
 * balik selain tombol back browser. Selalu mengarah ke halaman daftar
 * induknya (bukan `router.back()`) agar perilakunya konsisten dari mana
 * pun pengguna masuk ke halaman ini.
 */
export function BackLink({ href, label = "Kembali" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
    >
      <NavIcon name="arrowLeft" className="h-4 w-4" />
      {label}
    </Link>
  );
}

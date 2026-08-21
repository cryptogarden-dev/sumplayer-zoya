import Link from "next/link";
import type { Metadata } from "next";
import { NavIcon } from "@/components/app-shell/NavIcon";

export const metadata: Metadata = { title: "Tidak memiliki akses" };

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <NavIcon name="alertTriangle" className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-base font-semibold text-slate-900">Anda tidak memiliki akses</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Halaman ini hanya dapat diakses oleh peran tertentu (misalnya Pemilik/Admin). Hubungi
        pemilik usaha Anda jika membutuhkan akses.
      </p>
      <Link href="/" className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
        Kembali ke Beranda
      </Link>
    </div>
  );
}

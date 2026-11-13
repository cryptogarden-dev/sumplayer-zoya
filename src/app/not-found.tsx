import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-slate text-sm font-semibold">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Halaman yang Anda cari tidak ada atau sudah dipindahkan.
      </p>
      <Link
        href="/"
        className="bg-slate hover:bg-slate/90 mt-6 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}

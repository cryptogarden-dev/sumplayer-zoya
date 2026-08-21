"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-sm font-semibold text-red-600">Terjadi kesalahan</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Maaf, ada yang tidak beres</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Silakan coba lagi. Jika masalah berlanjut, hubungi administrator sistem Anda.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Coba lagi
      </button>
    </div>
  );
}

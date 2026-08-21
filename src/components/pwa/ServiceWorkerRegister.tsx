"use client";

import { useEffect } from "react";

/**
 * Registrasi service worker dasar (R24, poin 20 permintaan Tahap 1).
 * Sengaja hanya aktif pada build production: service worker cache-first
 * dapat mengganggu hot-reload dan menyembunyikan perubahan kode saat
 * pengembangan lokal.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Registrasi service worker gagal:", error);
    });
  }, []);

  return null;
}

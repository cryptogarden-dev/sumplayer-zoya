import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

/**
 * Font brand Zoya (docs/design/DESIGN_SPEC.md): judul Cormorant Garamond
 * 600, UI Plus Jakarta Sans. `next/font/google` mengunduh font saat build
 * dan menyajikannya sendiri (self-hosted) — tanpa request eksternal saat
 * runtime, jadi tidak menambah waktu muat halaman.
 */
const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: "600",
  variable: "--font-zoya-display",
  display: "swap",
});

const uiFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-zoya-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sistem Supplier & Perbandingan Harga",
    template: "%s | Sistem Supplier & Perbandingan Harga",
  },
  description:
    "Kelola supplier, bandingkan harga pembelian, hitung pajak dan ongkir, serta kelola pesanan pembelian dalam satu aplikasi.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2e4558",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${displayFont.variable} ${uiFont.variable}`}>
      <body className="bg-page text-slate min-h-dvh font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

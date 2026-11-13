import type { IconName } from "@/components/app-shell/NavIcon";

/**
 * Navigasi utama (R25): Supplier, Produk, Stok Toko, Bandingkan, Pesanan.
 * Beranda diakses lewat logo/judul di header, bukan bagian dari menu ini.
 * Konfigurasi ini menjadi satu sumber kebenaran yang dipakai baik oleh
 * Sidebar (desktop) maupun BottomNav (mobile) agar keduanya tidak pernah
 * tidak sinkron. Menu "Stok Toko" ditambahkan atas permintaan pengguna
 * 2026-11-13 (sebelumnya hanya 4 menu).
 */
export interface NavItem {
  key: "supplier" | "produk" | "stok" | "bandingkan" | "pesanan";
  href: string;
  label: string;
  icon: IconName;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "supplier", href: "/supplier", label: "Supplier", icon: "truck" },
  { key: "produk", href: "/produk", label: "Produk", icon: "package" },
  { key: "stok", href: "/stok", label: "Stok Toko", icon: "inbox" },
  { key: "bandingkan", href: "/bandingkan", label: "Bandingkan", icon: "scale" },
  { key: "pesanan", href: "/pesanan", label: "Pesanan", icon: "clipboardList" },
];

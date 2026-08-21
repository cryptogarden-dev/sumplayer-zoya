import type { IconName } from "@/components/app-shell/NavIcon";

/**
 * Navigasi utama dibatasi menjadi 4 menu (R25): Supplier, Produk,
 * Bandingkan, Pesanan. Beranda diakses lewat logo/judul di header, bukan
 * bagian dari 4 menu ini. Konfigurasi ini menjadi satu sumber kebenaran
 * yang dipakai baik oleh Sidebar (desktop) maupun BottomNav (mobile) agar
 * keduanya tidak pernah tidak sinkron.
 */
export interface NavItem {
  key: "supplier" | "produk" | "bandingkan" | "pesanan";
  href: string;
  label: string;
  icon: IconName;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "supplier", href: "/supplier", label: "Supplier", icon: "truck" },
  { key: "produk", href: "/produk", label: "Produk", icon: "package" },
  { key: "bandingkan", href: "/bandingkan", label: "Bandingkan", icon: "scale" },
  { key: "pesanan", href: "/pesanan", label: "Pesanan", icon: "clipboardList" },
];

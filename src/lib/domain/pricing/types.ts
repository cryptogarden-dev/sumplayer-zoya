/**
 * Status pajak (poin 6 Tahap 2, R07). Tarif pajak SELALU diberikan sebagai
 * data oleh pemanggil (mis. dari `tax_rates` milik bisnis) — tidak pernah
 * di-hardcode di modul ini.
 */
export const TAX_STATUSES = ["INCLUDED", "EXCLUDED", "NONE"] as const;
export type TaxStatus = (typeof TAX_STATUSES)[number];

/**
 * Status ketersediaan stok (poin 9 Tahap 2, R09).
 */
export const AVAILABILITY_STATUSES = [
  "TERSEDIA",
  "STOK_TERBATAS",
  "KOSONG",
  "PRE_ORDER",
  "PERLU_KONFIRMASI",
] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

/**
 * Mode ongkir (poin 10 Tahap 2, R08).
 */
export const SHIPPING_MODES = [
  "GRATIS_TANPA_SYARAT",
  "GRATIS_MIN_PEMBELIAN",
  "TETAP",
  "BERDASARKAN_AREA",
  "PICKUP",
  "PERLU_KONFIRMASI",
] as const;
export type ShippingMode = (typeof SHIPPING_MODES)[number];

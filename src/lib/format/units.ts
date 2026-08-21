import type { AvailabilityStatus, ShippingMode, TaxStatus } from "@/lib/domain/pricing/types";
import type {
  BaseUnit,
  MeasurementUnit,
  PackagingType,
  UnitFamily,
} from "@/lib/domain/units/types";

/**
 * Label Bahasa Indonesia untuk enum domain (R24/NFR-04 — lokalisasi).
 * HANYA untuk presentasi; nilai enum aslinya tetap dipakai untuk logika
 * dan penyimpanan.
 */
export const MEASUREMENT_UNIT_LABELS: Record<MeasurementUnit, string> = {
  GRAM: "gram",
  KILOGRAM: "kg",
  MILLILITER: "ml",
  LITER: "liter",
  PCS: "pcs",
  LUSIN: "lusin",
};

export const BASE_UNIT_LABELS: Record<BaseUnit, string> = {
  KILOGRAM: "kg",
  LITER: "liter",
  PCS: "pcs",
};

export const UNIT_FAMILY_LABELS: Record<UnitFamily, string> = {
  WEIGHT: "Berat (kg)",
  VOLUME: "Volume (liter)",
  COUNT: "Jumlah (pcs)",
};

export const PACKAGING_TYPE_LABELS: Record<PackagingType, string> = {
  DUS: "Dus",
  PAK: "Pak",
  KARUNG: "Karung",
  BOTOL: "Botol",
  KALENG: "Kaleng",
  SAK: "Sak",
  BAL: "Bal",
  TRAY: "Tray",
  BOX: "Box",
  RENCENG: "Renceng",
};

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  TERSEDIA: "Tersedia",
  STOK_TERBATAS: "Stok Terbatas",
  KOSONG: "Kosong",
  PRE_ORDER: "Pre-Order",
  PERLU_KONFIRMASI: "Perlu Konfirmasi",
};

export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  INCLUDED: "Sudah termasuk pajak",
  EXCLUDED: "Belum termasuk pajak",
  NONE: "Tanpa pajak",
};

export const SHIPPING_MODE_LABELS: Record<ShippingMode, string> = {
  GRATIS_TANPA_SYARAT: "Gratis ongkir tanpa syarat",
  GRATIS_MIN_PEMBELIAN: "Gratis ongkir dengan syarat minimum",
  TETAP: "Ongkir tetap",
  BERDASARKAN_AREA: "Ongkir berdasarkan area",
  PICKUP: "Ambil sendiri (pickup)",
  PERLU_KONFIRMASI: "Ongkir perlu konfirmasi",
};

export const DAY_OF_WEEK_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

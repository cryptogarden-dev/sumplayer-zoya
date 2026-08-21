import { Decimal } from "decimal.js";
import { money, type Money } from "@/lib/domain/money/money";

/**
 * Resolusi tarif ongkir per area untuk mode `BERDASARKAN_AREA` (Tahap 4,
 * R08 + R12). TERPISAH dari `pricing/shipping.ts` (Tahap 2, sudah teruji
 * golden case) agar modul itu tidak perlu disentuh ulang — fungsi ini
 * hanya mencari tarif yang cocok, perhitungan ongkirnya sendiri tetap
 * memakai `calculateShipping()`.
 *
 * Aturan pencocokan: baris area dengan `city` terisi HARUS cocok kota
 * DAN provinsi; baris area tanpa `city` (city null) berlaku untuk seluruh
 * provinsi tersebut. Baris kota yang lebih spesifik diprioritaskan.
 */
export interface ShippingAreaRateLike {
  province: string;
  city?: string | null;
  fee: Decimal.Value;
}

export interface ShippingAreaDestinationLike {
  province: string;
  city?: string | null;
}

function eq(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Mengembalikan `null` jika tidak ada tarif area yang cocok (belum diatur untuk tujuan ini). */
export function resolveAreaFee(
  areas: readonly ShippingAreaRateLike[],
  destination: ShippingAreaDestinationLike,
): Money | null {
  const cityMatch = areas.find(
    (area) =>
      area.city && eq(area.province, destination.province) && eq(area.city, destination.city),
  );
  if (cityMatch) return money(cityMatch.fee, "Ongkir area");

  const provinceMatch = areas.find((area) => !area.city && eq(area.province, destination.province));
  if (provinceMatch) return money(provinceMatch.fee, "Ongkir area");

  return null;
}

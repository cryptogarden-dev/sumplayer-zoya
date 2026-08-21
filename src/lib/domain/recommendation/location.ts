/**
 * Kecocokan lokasi/area (Tahap 4, R14 "melayani lokasi pengguna", R13
 * label "Paling Dekat"). Fungsi murni — data area & tujuan berupa string
 * yang sudah diambil pemanggil dari database.
 *
 * PENTING: proyek ini TIDAK memiliki data koordinat (lat/long) untuk
 * alamat bisnis pengguna (lihat `docs/DATA_MODEL.md` §1 `businesses`),
 * sehingga jarak sesungguhnya (meter/km) tidak dapat dihitung. "Paling
 * Dekat" di sini SENGAJA hanya memakai kecocokan kota/provinsi sebagai
 * proksi kedekatan yang jujur (bukan koordinat palsu) — jika tidak ada
 * kecocokan sama sekali, tidak ada supplier yang diberi label ini
 * (lebih baik tidak menampilkan label daripada menampilkan urutan yang
 * menyesatkan).
 */
export interface DeliveryAreaLike {
  province: string;
  city?: string | null;
  district?: string | null;
}

export interface DestinationLike {
  province: string;
  city?: string | null;
  district?: string | null;
}

function eq(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Menentukan apakah supplier melayani tujuan pengiriman berdasarkan
 * daftar area pengirimannya. Mengembalikan `"UNKNOWN"` (bukan `false`)
 * bila supplier belum mendaftarkan area sama sekali — data belum ada,
 * bukan berarti pasti tidak melayani (R14: jangan membuat kepastian
 * palsu).
 */
export function evaluateServesDestination(
  deliveryAreas: readonly DeliveryAreaLike[],
  destination: DestinationLike,
): boolean | "UNKNOWN" {
  if (deliveryAreas.length === 0) {
    return "UNKNOWN";
  }

  return deliveryAreas.some((area) => {
    if (!eq(area.province, destination.province)) return false;
    if (area.city && destination.city && !eq(area.city, destination.city)) return false;
    if (area.district && destination.district && !eq(area.district, destination.district)) {
      return false;
    }
    return true;
  });
}

export type ProximityLevel = "CITY" | "PROVINCE" | "NONE";

export interface ProximityResult {
  /** Skor kedekatan: makin kecil makin dekat. `null` = tidak ada info kecocokan sama sekali. */
  score: number | null;
  level: ProximityLevel;
}

const PROXIMITY_SCORE: Record<Exclude<ProximityLevel, "NONE">, number> = {
  CITY: 0,
  PROVINCE: 1,
};

/**
 * Proksi kedekatan supplier terhadap tujuan pengiriman berdasarkan
 * kecocokan kota (supplier atau salah satu area pengirimannya) atau
 * provinsi. Lihat catatan di atas modul ini soal keterbatasan data.
 */
export function evaluateProximity(
  supplierCity: string | null | undefined,
  deliveryAreas: readonly DeliveryAreaLike[],
  destination: DestinationLike,
): ProximityResult {
  if (
    eq(supplierCity, destination.city) ||
    deliveryAreas.some((area) => eq(area.city, destination.city))
  ) {
    return { score: PROXIMITY_SCORE.CITY, level: "CITY" };
  }

  if (deliveryAreas.some((area) => eq(area.province, destination.province))) {
    return { score: PROXIMITY_SCORE.PROVINCE, level: "PROVINCE" };
  }

  return { score: null, level: "NONE" };
}

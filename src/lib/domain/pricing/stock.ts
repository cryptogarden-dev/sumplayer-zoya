import { Decimal } from "decimal.js";
import { assertPositiveQuantity } from "@/lib/domain/units/convert";
import type { AvailabilityStatus } from "@/lib/domain/pricing/types";

/**
 * Evaluasi ketersediaan stok terhadap kebutuhan (poin 9 Tahap 2, R09).
 *
 * Aturan penting: status "PERLU_KONFIRMASI" TIDAK PERNAH dianggap sebagai
 * stok yang pasti tersedia (`meetsNeed` selalu `false`, `isCertain` selalu
 * `false`) — supplier harus dihubungi dulu untuk memastikan.
 */
export interface StockInput {
  availabilityStatus: AvailabilityStatus;
  /** Jumlah kemasan tersedia, jika diketahui. Opsional (mis. tidak diketahui untuk PRE_ORDER/PERLU_KONFIRMASI). */
  availablePackages?: Decimal.Value;
  /** Jumlah kemasan yang ingin dibeli (mis. dari calculatePurchaseQuantity().packagesToBuy). */
  packagesNeeded: Decimal.Value;
}

export interface StockEvaluation {
  /** Apakah stok, sejauh yang diketahui, PASTI dapat memenuhi kebutuhan. */
  meetsNeed: boolean;
  /** Apakah status ini memberi kepastian (true) atau masih perlu verifikasi lebih lanjut (false). */
  isCertain: boolean;
  reason: string;
}

export function evaluateStock(input: StockInput): StockEvaluation {
  const packagesNeeded = assertPositiveQuantity(input.packagesNeeded, "Jumlah kemasan dibutuhkan");
  const availablePackages =
    input.availablePackages === undefined ? undefined : new Decimal(input.availablePackages);

  switch (input.availabilityStatus) {
    case "KOSONG":
      // Kasus uji #19: stok kosong tidak memenuhi kebutuhan.
      return {
        meetsNeed: false,
        isCertain: true,
        reason: "Stok kosong, tidak dapat memenuhi kebutuhan.",
      };

    case "TERSEDIA": {
      if (availablePackages === undefined) {
        return {
          meetsNeed: true,
          isCertain: true,
          reason: "Stok berstatus tersedia tanpa batas jumlah yang dilaporkan.",
        };
      }
      // Kasus uji #20: stok kurang ditandai tidak cukup.
      const meetsNeed = availablePackages.gte(packagesNeeded);
      return {
        meetsNeed,
        isCertain: true,
        reason: meetsNeed
          ? "Stok tersedia mencukupi kebutuhan."
          : `Stok tersedia (${availablePackages.toString()}) kurang dari kebutuhan (${packagesNeeded.toString()}).`,
      };
    }

    case "STOK_TERBATAS": {
      if (availablePackages === undefined) {
        return {
          meetsNeed: false,
          isCertain: false,
          reason: "Stok terbatas tanpa jumlah pasti; kecukupan belum dapat dipastikan.",
        };
      }
      const meetsNeed = availablePackages.gte(packagesNeeded);
      return {
        meetsNeed,
        isCertain: true,
        reason: meetsNeed
          ? "Stok terbatas namun masih mencukupi kebutuhan."
          : `Stok terbatas (${availablePackages.toString()}) kurang dari kebutuhan (${packagesNeeded.toString()}).`,
      };
    }

    case "PRE_ORDER":
      return {
        meetsNeed: false,
        isCertain: false,
        reason: "Pre-order: barang belum tersedia secara fisik, kecukupan belum pasti.",
      };

    case "PERLU_KONFIRMASI":
      // Poin 9 & kasus terkait #18-style: jangan menganggap ini stok pasti tersedia.
      return {
        meetsNeed: false,
        isCertain: false,
        reason: "Ketersediaan perlu dikonfirmasi ke supplier; belum dapat dipastikan mencukupi.",
      };

    default: {
      const exhaustiveCheck: never = input.availabilityStatus;
      return {
        meetsNeed: false,
        isCertain: false,
        reason: `Status ketersediaan tidak dikenali: ${String(exhaustiveCheck)}`,
      };
    }
  }
}

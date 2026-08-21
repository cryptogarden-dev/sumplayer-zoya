import { Decimal } from "decimal.js";
import { money, type Money } from "@/lib/domain/money/money";
import { InvalidConfigurationError } from "@/lib/domain/errors/domain-errors";
import type { ShippingMode } from "@/lib/domain/pricing/types";

/**
 * Perhitungan ongkir (poin 10 Tahap 2, R08).
 *
 * PENTING: mode "PERLU_KONFIRMASI" mengembalikan `fee: null` (BUKAN nol!)
 * — total biaya yang melibatkan ongkir ini juga harus dianggap belum
 * pasti (lihat order-total.ts), sesuai kasus uji #18.
 */
export interface ShippingInput {
  mode: ShippingMode;
  /** Subtotal (setelah pajak) — dipakai untuk mengevaluasi syarat GRATIS_MIN_PEMBELIAN. */
  subtotal: Decimal.Value;
  /** Syarat minimum pembelian agar gratis ongkir (mode GRATIS_MIN_PEMBELIAN). */
  freeShippingMinAmount?: Decimal.Value;
  /** Ongkir yang dikenakan jika syarat gratis ongkir belum terpenuhi, atau untuk mode TETAP. */
  flatFee?: Decimal.Value;
  /** Ongkir untuk mode BERDASARKAN_AREA (nilai sudah di-resolve pemanggil berdasarkan area tujuan). */
  areaFee?: Decimal.Value;
}

export interface ShippingResult {
  /** Nilai ongkir. `null` berarti BELUM DIKETAHUI (perlu konfirmasi), bukan nol. */
  fee: Money | null;
  isFreeShipping: boolean;
  requiresConfirmation: boolean;
  isPickup: boolean;
  label: string;
}

export function calculateShipping(input: ShippingInput): ShippingResult {
  const subtotal = money(input.subtotal, "Subtotal");

  switch (input.mode) {
    case "GRATIS_TANPA_SYARAT":
      // Kasus uji #16: selalu nol, apa pun subtotalnya.
      return {
        fee: new Decimal(0),
        isFreeShipping: true,
        requiresConfirmation: false,
        isPickup: false,
        label: "Gratis Ongkir",
      };

    case "GRATIS_MIN_PEMBELIAN": {
      if (input.freeShippingMinAmount === undefined) {
        throw new InvalidConfigurationError(
          "Syarat minimum gratis ongkir wajib diisi untuk mode GRATIS_MIN_PEMBELIAN.",
        );
      }
      const minAmount = money(input.freeShippingMinAmount, "Syarat minimum gratis ongkir");

      // Kasus uji #14: subtotal TEPAT pada batas -> gratis ongkir (pakai >=, bukan >).
      const isFree = subtotal.gte(minAmount);
      if (isFree) {
        return {
          fee: new Decimal(0),
          isFreeShipping: true,
          requiresConfirmation: false,
          isPickup: false,
          label: "Gratis Ongkir",
        };
      }

      // Kasus uji #15: subtotal di bawah batas -> ongkir normal.
      if (input.flatFee === undefined) {
        throw new InvalidConfigurationError(
          "Ongkir normal wajib diisi untuk mode GRATIS_MIN_PEMBELIAN saat syarat belum terpenuhi.",
        );
      }
      return {
        fee: money(input.flatFee, "Ongkir"),
        isFreeShipping: false,
        requiresConfirmation: false,
        isPickup: false,
        label: "Ongkir Berlaku",
      };
    }

    case "TETAP": {
      if (input.flatFee === undefined) {
        throw new InvalidConfigurationError("Ongkir tetap wajib diisi untuk mode TETAP.");
      }
      return {
        fee: money(input.flatFee, "Ongkir tetap"),
        isFreeShipping: false,
        requiresConfirmation: false,
        isPickup: false,
        label: "Ongkir Tetap",
      };
    }

    case "BERDASARKAN_AREA": {
      if (input.areaFee === undefined) {
        throw new InvalidConfigurationError("Ongkir area wajib diisi untuk mode BERDASARKAN_AREA.");
      }
      return {
        fee: money(input.areaFee, "Ongkir area"),
        isFreeShipping: false,
        requiresConfirmation: false,
        isPickup: false,
        label: "Ongkir Berdasarkan Area",
      };
    }

    case "PICKUP":
      // Kasus uji #17: pickup -> ongkir nol dan label pickup.
      return {
        fee: new Decimal(0),
        isFreeShipping: true,
        requiresConfirmation: false,
        isPickup: true,
        label: "Pickup",
      };

    case "PERLU_KONFIRMASI":
      // Kasus uji #18: TIDAK BOLEH dianggap nol.
      return {
        fee: null,
        isFreeShipping: false,
        requiresConfirmation: true,
        isPickup: false,
        label: "Perlu Konfirmasi",
      };

    default: {
      const exhaustiveCheck: never = input.mode;
      throw new InvalidConfigurationError(`Mode ongkir tidak dikenali: ${String(exhaustiveCheck)}`);
    }
  }
}

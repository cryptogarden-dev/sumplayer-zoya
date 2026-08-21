import { Decimal } from "decimal.js";
import { money, type Money } from "@/lib/domain/money/money";
import { InvalidMoneyError } from "@/lib/domain/errors/domain-errors";
import type { TaxStatus } from "@/lib/domain/pricing/types";

/**
 * Perhitungan pajak (poin 6 & 7 Tahap 2, R07):
 * - INCLUDED: `pricePerPackage` yang diberikan SUDAH termasuk pajak.
 * - EXCLUDED: `pricePerPackage` BELUM termasuk pajak, pajak ditambahkan.
 * - NONE: tidak ada pajak sama sekali.
 *
 * `taxRatePercent` WAJIB diberikan sebagai data oleh pemanggil (mis. dari
 * `tax_rates` milik bisnis yang berlaku saat itu / snapshot historis) —
 * tidak pernah di-hardcode di modul ini (R07).
 */
export interface TaxInput {
  taxStatus: TaxStatus;
  /** Harga per kemasan sebagaimana tertulis (interpretasinya tergantung taxStatus). */
  pricePerPackage: Decimal.Value;
  /** Tarif pajak dalam persen, mis. 11 untuk 11%. Diabaikan jika taxStatus = NONE. */
  taxRatePercent: Decimal.Value;
}

export interface TaxResult {
  /** Harga sebelum pajak. */
  priceBeforeTax: Money;
  /** Nilai nominal pajak. */
  taxAmount: Money;
  /** Harga setelah pajak. */
  priceAfterTax: Money;
}

function assertValidTaxRate(taxRatePercent: Decimal.Value): Decimal {
  const rate = new Decimal(taxRatePercent);

  if (!rate.isFinite()) {
    throw new InvalidMoneyError("Tarif pajak harus berupa angka yang valid.");
  }

  if (rate.isNegative()) {
    throw new InvalidMoneyError("Tarif pajak tidak boleh negatif.");
  }

  return rate;
}

export function calculateTax(input: TaxInput): TaxResult {
  const price = money(input.pricePerPackage, "Harga per kemasan");

  switch (input.taxStatus) {
    case "NONE": {
      // Kasus uji #13: harga NONE tidak terkena pajak.
      return {
        priceBeforeTax: price,
        taxAmount: new Decimal(0),
        priceAfterTax: price,
      };
    }

    case "INCLUDED": {
      // Kasus uji #11: harga INCLUDED tidak ditambahkan pajak lagi.
      // Harga yang diberikan sudah termasuk pajak; hitung mundur untuk
      // mendapatkan harga sebelum pajak & nilai pajaknya.
      const ratePercent = assertValidTaxRate(input.taxRatePercent);
      const divisor = ratePercent.div(100).plus(1);
      const priceBeforeTax = price.div(divisor);
      const taxAmount = price.minus(priceBeforeTax);

      return {
        priceBeforeTax,
        taxAmount,
        priceAfterTax: price,
      };
    }

    case "EXCLUDED": {
      // Kasus uji #12: harga EXCLUDED ditambahkan sesuai tarif.
      const ratePercent = assertValidTaxRate(input.taxRatePercent);
      const taxAmount = price.mul(ratePercent).div(100);
      const priceAfterTax = price.plus(taxAmount);

      return {
        priceBeforeTax: price,
        taxAmount,
        priceAfterTax,
      };
    }

    default: {
      const exhaustiveCheck: never = input.taxStatus;
      throw new InvalidMoneyError(`Status pajak tidak dikenali: ${String(exhaustiveCheck)}`);
    }
  }
}

import { z } from "zod";
import { SHIPPING_MODES } from "@/lib/domain";
import { optionalText } from "@/lib/validation/common";

export const shippingRuleAreaInputSchema = z.object({
  province: z.string().trim().min(1, "Provinsi wajib diisi").max(100),
  city: optionalText(100),
  fee: z.number().min(0, "Ongkir tidak boleh negatif"),
});

export type ShippingRuleAreaInput = z.infer<typeof shippingRuleAreaInputSchema>;

/**
 * Aturan ongkir per supplier (R08). Field yang wajib diisi berbeda-beda
 * tergantung `ruleType`, ditegakkan lewat `.superRefine` di bawah - sesuai
 * kontrak `calculateShipping()` (src/lib/domain/pricing/shipping.ts, Tahap 2)
 * yang melempar `InvalidConfigurationError` bila parameter mode tertentu
 * tidak lengkap.
 */
export const shippingRuleInputSchema = z
  .object({
    ruleType: z.enum(SHIPPING_MODES),
    freeShippingMinAmount: z.number().min(0).optional(),
    flatFee: z.number().min(0).optional(),
    notes: optionalText(1000),
    areas: z.array(shippingRuleAreaInputSchema).max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ruleType === "GRATIS_MIN_PEMBELIAN") {
      if (data.freeShippingMinAmount === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Minimum pembelian untuk gratis ongkir wajib diisi.",
          path: ["freeShippingMinAmount"],
        });
      }
      if (data.flatFee === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Ongkir normal (jika syarat tidak terpenuhi) wajib diisi.",
          path: ["flatFee"],
        });
      }
    }

    if (data.ruleType === "TETAP" && data.flatFee === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Nilai ongkir tetap wajib diisi.",
        path: ["flatFee"],
      });
    }

    if (data.ruleType === "BERDASARKAN_AREA" && (!data.areas || data.areas.length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Tambahkan minimal satu tarif area untuk mode ongkir berdasarkan area.",
        path: ["areas"],
      });
    }
  });

export type ShippingRuleInput = z.infer<typeof shippingRuleInputSchema>;

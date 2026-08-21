import { z } from "zod";

/**
 * Tarif pajak dapat diatur per bisnis, tidak hardcode (R07). Hanya
 * Pemilik/Admin yang dapat mengelola (R26, ARCHITECTURE.md §5).
 */
export const taxRateInputSchema = z.object({
  name: z.string().trim().min(1, "Nama tarif wajib diisi").max(100),
  ratePercent: z
    .number()
    .min(0, "Tarif pajak tidak boleh negatif")
    .max(100, "Tarif pajak maksimal 100%"),
  isDefault: z.boolean().optional().default(false),
});

export type TaxRateInput = z.infer<typeof taxRateInputSchema>;

export const taxRateUpdateSchema = taxRateInputSchema.extend({
  isActive: z.boolean().optional(),
});

export const businessSettingsInputSchema = z.object({
  staleDataThresholdDays: z
    .number()
    .int("Ambang data lama harus bilangan bulat hari")
    .positive("Ambang data lama harus lebih dari nol hari"),
});

export type BusinessSettingsInput = z.infer<typeof businessSettingsInputSchema>;

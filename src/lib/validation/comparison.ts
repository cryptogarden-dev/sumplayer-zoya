import { z } from "zod";
import { MEASUREMENT_UNITS } from "@/lib/domain/units/types";

/**
 * Parameter permintaan halaman Bandingkan (Tahap 4, R12). Dipakai untuk
 * memvalidasi query string `GET /api/comparison` — satu sumber kebenaran
 * yang sama dipakai form client (lihat `ComparisonForm`).
 */
export const comparisonQuerySchema = z.object({
  productId: z.string().uuid("Produk wajib dipilih"),
  neededQuantity: z.coerce.number().positive("Jumlah kebutuhan harus lebih dari nol"),
  neededUnit: z.enum(MEASUREMENT_UNITS),
  province: z.string().trim().min(1, "Provinsi tujuan wajib diisi").max(100),
  city: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  district: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  neededByDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Tanggal kebutuhan tidak valid"),
});

export type ComparisonQuery = z.infer<typeof comparisonQuerySchema>;

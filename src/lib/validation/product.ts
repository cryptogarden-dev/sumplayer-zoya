import { z } from "zod";
import { UNIT_FAMILIES } from "@/lib/domain/units/types";
import { booleanQueryParam } from "@/lib/validation/query";
import { optionalText } from "@/lib/validation/common";

/**
 * Master produk (R02). `unitFamily` menentukan `baseUnit` yang valid;
 * `baseUnit` sendiri SELALU diturunkan otomatis di server dari
 * `BASE_UNIT_BY_FAMILY` (mesin konversi Tahap 2) - tidak pernah dipilih
 * bebas oleh klien - lihat `src/lib/server/repositories/product-repository.ts`.
 */
export const productInputSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "SKU wajib diisi")
    .max(64, "SKU maksimal 64 karakter")
    .regex(/^[A-Za-z0-9._-]+$/, "SKU hanya boleh huruf, angka, titik, strip, dan underscore"),
  barcode: optionalText(64),
  productName: z.string().trim().min(2, "Nama produk minimal 2 karakter").max(200),
  brand: optionalText(100),
  variant: optionalText(100),
  categoryId: z.string().uuid().optional(),
  photoUrl: optionalText(1000),
  unitFamily: z.enum(UNIT_FAMILIES),
  notes: optionalText(2000),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const productUpdateSchema = productInputSchema;

export const productCategoryInputSchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(100),
});

export const searchProductQuerySchema = z.object({
  q: z.string().trim().max(150).optional(),
  categoryId: z.string().uuid().optional(),
  includeInactive: booleanQueryParam,
});

export type SearchProductQuery = z.infer<typeof searchProductQuerySchema>;

import { z } from "zod";
import {
  AVAILABILITY_STATUSES,
  MEASUREMENT_UNITS,
  PACKAGING_TYPES,
  TAX_STATUSES,
} from "@/lib/domain";
import { optionalText } from "@/lib/validation/common";

/**
 * Bagian pajak dari sebuah entri harga (dipakai baik saat membuat penawaran
 * maupun saat menambah riwayat harga baru, R07/R20).
 *
 * `taxRateId` WAJIB diisi kecuali `taxStatus = NONE` (selaras dengan catatan
 * DATA_MODEL.md §13: "NULL wajib jika tax_status = NONE"). Nilai tarif
 * (`taxRateValueSnapshot`) TIDAK diterima dari klien - server selalu
 * mengambil nilai aktual dari `tax_rates` milik bisnis saat entri dibuat,
 * agar pengguna tidak dapat memalsukan tarif pajak (Keamanan: "Jangan
 * mempercayai nilai perhitungan dari client").
 */
export const priceTaxInputSchema = z
  .object({
    pricePerPackage: z.number().min(0, "Harga tidak boleh negatif"),
    taxStatus: z.enum(TAX_STATUSES),
    taxRateId: z.string().uuid().optional(),
    priceSourceNote: optionalText(500),
  })
  .refine((data) => data.taxStatus === "NONE" || data.taxRateId !== undefined, {
    message: "Pilih tarif pajak yang berlaku untuk status pajak ini.",
    path: ["taxRateId"],
  })
  .refine((data) => data.taxStatus !== "NONE" || data.taxRateId === undefined, {
    message: "Status pajak 'Tanpa Pajak' tidak boleh memiliki tarif pajak.",
    path: ["taxRateId"],
  });

export type PriceTaxInput = z.infer<typeof priceTaxInputSchema>;

export const stockInputSchema = z.object({
  availabilityStatus: z.enum(AVAILABILITY_STATUSES),
  stockQty: z.number().min(0, "Jumlah stok tidak boleh negatif").optional(),
});

export type StockInput = z.infer<typeof stockInputSchema>;

/**
 * Struktur kemasan penawaran (R03). `totalPackageContent` SENGAJA tidak
 * ada di sini - selalu dihitung ulang server memakai `resolvePackage()`
 * (Tahap 2), tidak pernah diterima mentah dari klien.
 */
export const packageDefinitionInputSchema = z.object({
  packageType: z.enum(PACKAGING_TYPES),
  itemsPerPackage: z.number().positive("Jumlah barang dalam kemasan harus lebih dari nol"),
  contentPerItem: z.number().positive("Isi setiap barang harus lebih dari nol"),
  contentUnit: z.enum(MEASUREMENT_UNITS),
  minPurchasePackages: z.number().positive("Minimum pembelian harus lebih dari nol").default(1),
  purchaseMultiplePackages: z
    .number()
    .int("Kelipatan pembelian harus bilangan bulat")
    .positive("Kelipatan pembelian harus lebih dari nol")
    .default(1),
  estimatedDeliveryDaysMin: z.number().int().min(0).optional(),
  estimatedDeliveryDaysMax: z.number().int().min(0).optional(),
});

export const supplierProductInputSchema = z
  .object({
    supplierId: z.string().uuid("Supplier wajib dipilih"),
    productId: z.string().uuid("Produk wajib dipilih"),
    supplierSkuOrName: optionalText(150),
  })
  .and(packageDefinitionInputSchema)
  .and(
    z.object({
      price: priceTaxInputSchema,
      stock: stockInputSchema,
    }),
  )
  .refine(
    (data) =>
      data.estimatedDeliveryDaysMin === undefined ||
      data.estimatedDeliveryDaysMax === undefined ||
      data.estimatedDeliveryDaysMax >= data.estimatedDeliveryDaysMin,
    {
      message: "Estimasi pengiriman maksimum tidak boleh kurang dari minimum.",
      path: ["estimatedDeliveryDaysMax"],
    },
  );

export type SupplierProductInput = z.infer<typeof supplierProductInputSchema>;

/** Update definisi kemasan/aturan pembelian penawaran (BUKAN harga - lihat `priceTaxInputSchema`). */
export const supplierProductDefinitionUpdateSchema = packageDefinitionInputSchema
  .extend({ supplierSkuOrName: optionalText(150) })
  .refine(
    (data) =>
      data.estimatedDeliveryDaysMin === undefined ||
      data.estimatedDeliveryDaysMax === undefined ||
      data.estimatedDeliveryDaysMax >= data.estimatedDeliveryDaysMin,
    {
      message: "Estimasi pengiriman maksimum tidak boleh kurang dari minimum.",
      path: ["estimatedDeliveryDaysMax"],
    },
  );

/** Preview konversi kemasan sebelum disimpan (tanpa menyentuh database). */
export const packagePreviewInputSchema = packageDefinitionInputSchema.pick({
  packageType: true,
  itemsPerPackage: true,
  contentPerItem: true,
  contentUnit: true,
});

export type PackagePreviewInput = z.infer<typeof packagePreviewInputSchema>;
export type SupplierProductDefinitionUpdate = z.infer<typeof supplierProductDefinitionUpdateSchema>;

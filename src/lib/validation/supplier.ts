import { z } from "zod";
import { optionalPhoneSchema, optionalUrlSchema } from "@/lib/validation/phone";
import { booleanQueryParam } from "@/lib/validation/query";
import { optionalFormattedText, optionalText } from "@/lib/validation/common";

/**
 * Hari dalam seminggu (0 = Minggu ... 6 = Sabtu), konsisten dengan
 * `supplier_delivery_schedules.day_of_week` (DATA_MODEL.md §7).
 */
export const DAY_OF_WEEK_LABELS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

export const dayOfWeekSchema = z.number().int().min(0).max(6);

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const optionalEmailSchema = optionalFormattedText(z.string().email("Format email tidak valid"));

/**
 * Data inti supplier (R01). Field wajib minimal: nama supplier, salah satu
 * kontak (HP/WA), status aktif (default true saat dibuat).
 */
export const supplierInputSchema = z
  .object({
    supplierName: z.string().trim().min(2, "Nama supplier minimal 2 karakter").max(150),
    companyName: optionalText(150),
    contactName: optionalText(150),
    phoneNumber: optionalPhoneSchema,
    whatsappNumber: optionalPhoneSchema,
    email: optionalEmailSchema,
    address: z.string().trim().min(5, "Alamat minimal 5 karakter").max(500),
    province: z.string().trim().min(1, "Provinsi wajib diisi").max(100),
    city: z.string().trim().min(1, "Kota/kabupaten wajib diisi").max(100),
    district: optionalText(100),
    postalCode: optionalFormattedText(z.string().regex(/^\d{5}$/, "Kode pos harus 5 digit angka")),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    mapLocation: optionalUrlSchema,
    operatingHours: optionalText(200),
    leadTimeDaysMin: z.number().int().min(0).default(0),
    leadTimeDaysMax: z.number().int().min(0),
    orderCutoffTime: optionalFormattedText(
      z.string().regex(TIME_REGEX, "Format jam harus HH:mm, contoh 15:00"),
    ),
    orderCutoffDays: z.array(dayOfWeekSchema).optional(),
    minPurchaseAmount: z.number().min(0).optional(),
    paymentMethod: optionalText(100),
    paymentTermDays: z.number().int().min(0).optional(),
    notes: optionalText(2000),
  })
  .refine((data) => data.phoneNumber !== undefined || data.whatsappNumber !== undefined, {
    message: "Wajib mengisi salah satu: nomor HP atau nomor WhatsApp.",
    path: ["phoneNumber"],
  })
  .refine((data) => data.leadTimeDaysMax >= data.leadTimeDaysMin, {
    message: "Lead time maksimum tidak boleh kurang dari lead time minimum.",
    path: ["leadTimeDaysMax"],
  });

export type SupplierInput = z.infer<typeof supplierInputSchema>;

/** Sama dengan `supplierInputSchema`, tapi seluruh field bersifat parsial (untuk PATCH). */
export const supplierUpdateSchema = supplierInputSchema;

export const supplierContactInputSchema = z.object({
  contactName: z.string().trim().min(1, "Nama kontak wajib diisi").max(150),
  roleTitle: optionalText(100),
  phoneNumber: optionalPhoneSchema,
  whatsappNumber: optionalPhoneSchema,
  email: optionalEmailSchema,
  isPrimary: z.boolean().optional().default(false),
});

export type SupplierContactInput = z.infer<typeof supplierContactInputSchema>;

export const supplierDeliveryAreaInputSchema = z.object({
  province: z.string().trim().min(1, "Provinsi wajib diisi").max(100),
  city: optionalText(100),
  district: optionalText(100),
  notes: optionalText(500),
});

export type SupplierDeliveryAreaInput = z.infer<typeof supplierDeliveryAreaInputSchema>;

export const supplierDeliveryAreasReplaceSchema = z.object({
  areas: z.array(supplierDeliveryAreaInputSchema).max(50),
});

export const supplierDeliverySchedulesReplaceSchema = z.object({
  days: z
    .array(
      z.object({
        dayOfWeek: dayOfWeekSchema,
        notes: optionalText(200),
      }),
    )
    .max(7),
});

export const searchSupplierQuerySchema = z.object({
  q: z.string().trim().max(150).optional(),
  city: z.string().trim().max(100).optional(),
  area: z.string().trim().max(100).optional(),
  includeInactive: booleanQueryParam,
});

export type SearchSupplierQuery = z.infer<typeof searchSupplierQuerySchema>;

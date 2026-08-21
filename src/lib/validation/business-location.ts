import { z } from "zod";
import { optionalText } from "@/lib/validation/common";

/**
 * Lokasi/cabang bisnis (pengembangan lanjutan disepakati 2026-08-18 -
 * lihat docs/BACKLOG.md #1). Dipakai untuk mengisi otomatis alamat
 * tujuan pada halaman Bandingkan & Pesanan.
 */
export const businessLocationInputSchema = z.object({
  name: z.string().trim().min(1, "Nama lokasi wajib diisi").max(100),
  province: z.string().trim().min(1, "Provinsi wajib diisi").max(100),
  city: optionalText(100),
  district: optionalText(100),
  address: optionalText(500),
  isDefault: z.boolean().optional().default(false),
});

export type BusinessLocationInput = z.infer<typeof businessLocationInputSchema>;

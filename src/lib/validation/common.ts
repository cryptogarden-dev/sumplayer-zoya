import { z } from "zod";

/**
 * Teks opsional: string kosong dianggap "tidak diisi" (undefined). Memakai
 * `z.preprocess` (bukan `.optional().or(z.literal("")).transform(...)`)
 * agar `z.infer` tetap menandai field ini sebagai KEY opsional pada objek
 * (`field?: string`), bukan key wajib berisi `string | undefined` - lebih
 * ergonomis dipakai di object literal (mis. pada test) dan konsisten
 * dengan pola di `src/lib/validation/phone.ts`.
 */
export const optionalText = (max: number, message?: string) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().max(max, message).optional());

/**
 * Sama seperti `optionalText`, tapi menerima skema string kustom (mis.
 * `.email()`, `.regex()`) alih-alih hanya batas panjang.
 */
export function optionalFormattedText(schema: z.ZodString) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional());
}

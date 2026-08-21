import { z } from "zod";

/**
 * Validasi nomor telepon/WhatsApp Indonesia (poin 2 Tahap 3: "Validasi
 * nomor telepon dan URL"). Menerima format umum: diawali `08`, `+628`,
 * atau `628`, diikuti 7-11 digit lagi, sesuai rentang panjang nomor
 * seluler Indonesia yang lazim dipakai.
 */
export const INDONESIAN_PHONE_REGEX = /^(\+62|62|0)8[0-9]{7,11}$/;

function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, "").trim();
}

export function isValidIndonesianPhone(value: string): boolean {
  return INDONESIAN_PHONE_REGEX.test(normalizePhone(value));
}

const PHONE_ERROR_MESSAGE =
  "Nomor tidak valid. Gunakan format Indonesia, contoh: 08123456789 atau +628123456789.";

/** Nomor telepon WAJIB diisi. */
export const requiredPhoneSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizePhone(value) : value),
  z.string().regex(INDONESIAN_PHONE_REGEX, PHONE_ERROR_MESSAGE),
);

/** Nomor telepon opsional - string kosong dianggap "tidak diisi" (undefined). */
export const optionalPhoneSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = normalizePhone(value);
  return normalized === "" ? undefined : normalized;
}, z.string().regex(INDONESIAN_PHONE_REGEX, PHONE_ERROR_MESSAGE).optional());

const URL_ERROR_MESSAGE =
  "Tautan tidak valid. Gunakan URL lengkap, contoh: https://maps.google.com/...";

/** Tautan (mis. Google Maps) opsional - string kosong dianggap "tidak diisi". */
export const optionalUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().url(URL_ERROR_MESSAGE).optional());

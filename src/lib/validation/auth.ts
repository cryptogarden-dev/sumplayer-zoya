import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerBusinessSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Nama usaha minimal 2 karakter")
    .max(150, "Nama usaha maksimal 150 karakter"),
  ownerName: z
    .string()
    .trim()
    .min(2, "Nama pemilik minimal 2 karakter")
    .max(150, "Nama pemilik maksimal 150 karakter"),
  email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter")
    .max(72, "Kata sandi maksimal 72 karakter")
    .regex(/[0-9]/, "Kata sandi harus mengandung setidaknya satu angka"),
});

export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;

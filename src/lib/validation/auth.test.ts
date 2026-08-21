import { describe, expect, it } from "vitest";
import { loginSchema, registerBusinessSchema } from "@/lib/validation/auth";

describe("loginSchema", () => {
  it("menerima email dan kata sandi yang valid", () => {
    const result = loginSchema.safeParse({ email: "user@contoh.test", password: "rahasia" });
    expect(result.success).toBe(true);
  });

  it("menolak email dengan format tidak valid", () => {
    const result = loginSchema.safeParse({ email: "bukan-email", password: "rahasia" });
    expect(result.success).toBe(false);
  });

  it("menolak kata sandi kosong", () => {
    const result = loginSchema.safeParse({ email: "user@contoh.test", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("registerBusinessSchema", () => {
  const validPayload = {
    businessName: "Toko Contoh",
    ownerName: "Budi Santoso",
    email: "pemilik@contoh.test",
    password: "sandi1234",
  };

  it("menerima data pendaftaran yang valid", () => {
    expect(registerBusinessSchema.safeParse(validPayload).success).toBe(true);
  });

  it("menolak kata sandi kurang dari 8 karakter", () => {
    const result = registerBusinessSchema.safeParse({ ...validPayload, password: "abc1" });
    expect(result.success).toBe(false);
  });

  it("menolak kata sandi tanpa angka", () => {
    const result = registerBusinessSchema.safeParse({ ...validPayload, password: "tanpaangka" });
    expect(result.success).toBe(false);
  });

  it("menolak nama usaha yang terlalu pendek", () => {
    const result = registerBusinessSchema.safeParse({ ...validPayload, businessName: "A" });
    expect(result.success).toBe(false);
  });
});

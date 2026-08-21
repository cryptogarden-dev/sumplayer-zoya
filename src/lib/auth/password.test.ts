import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("menghasilkan hash yang berbeda dari kata sandi asli", async () => {
    const hash = await hashPassword("ContohSandi123");
    expect(hash).not.toBe("ContohSandi123");
  });

  it("berhasil memverifikasi kata sandi yang benar", async () => {
    const hash = await hashPassword("ContohSandi123");
    await expect(verifyPassword("ContohSandi123", hash)).resolves.toBe(true);
  });

  it("menolak kata sandi yang salah", async () => {
    const hash = await hashPassword("ContohSandi123");
    await expect(verifyPassword("SalahSandi", hash)).resolves.toBe(false);
  });
});

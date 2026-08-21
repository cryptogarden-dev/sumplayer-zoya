import { describe, expect, it } from "vitest";
import {
  isValidIndonesianPhone,
  optionalPhoneSchema,
  optionalUrlSchema,
  requiredPhoneSchema,
} from "@/lib/validation/phone";

describe("isValidIndonesianPhone", () => {
  it("menerima format 08xx", () => {
    expect(isValidIndonesianPhone("081234567890")).toBe(true);
  });

  it("menerima format +628xx", () => {
    expect(isValidIndonesianPhone("+6281234567890")).toBe(true);
  });

  it("menerima format 628xx tanpa plus", () => {
    expect(isValidIndonesianPhone("6281234567890")).toBe(true);
  });

  it("menolak nomor yang terlalu pendek", () => {
    expect(isValidIndonesianPhone("0812")).toBe(false);
  });

  it("menolak nomor yang bukan seluler (tidak diawali 8 setelah kode negara)", () => {
    expect(isValidIndonesianPhone("0211234567")).toBe(false);
  });

  it("menolak string bukan angka", () => {
    expect(isValidIndonesianPhone("abc123")).toBe(false);
  });
});

describe("requiredPhoneSchema", () => {
  it("meloloskan nomor valid", () => {
    expect(requiredPhoneSchema.safeParse("0812-3456-7890").success).toBe(true);
  });

  it("menolak nomor kosong", () => {
    expect(requiredPhoneSchema.safeParse("").success).toBe(false);
  });

  it("menolak nomor tidak valid", () => {
    expect(requiredPhoneSchema.safeParse("123").success).toBe(false);
  });
});

describe("optionalPhoneSchema", () => {
  it("meloloskan string kosong sebagai undefined", () => {
    const result = optionalPhoneSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });

  it("menolak nomor tidak valid saat diisi", () => {
    expect(optionalPhoneSchema.safeParse("bukan-nomor").success).toBe(false);
  });

  it("meloloskan nomor valid", () => {
    const result = optionalPhoneSchema.safeParse("081234567890");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("081234567890");
    }
  });
});

describe("optionalUrlSchema", () => {
  it("meloloskan string kosong sebagai undefined", () => {
    const result = optionalUrlSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });

  it("meloloskan URL valid", () => {
    const result = optionalUrlSchema.safeParse("https://maps.google.com/?q=-6.2,106.8");
    expect(result.success).toBe(true);
  });

  it("menolak string yang bukan URL", () => {
    expect(optionalUrlSchema.safeParse("bukan url").success).toBe(false);
  });
});

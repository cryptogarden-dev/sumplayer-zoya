import { describe, expect, it } from "vitest";
import { formatTanggalIndonesia, formatTanggalWaktuIndonesia } from "@/lib/format/date";

describe("formatTanggalIndonesia (R24 - format tanggal Indonesia)", () => {
  it("memformat tanggal dengan nama bulan Bahasa Indonesia", () => {
    const result = formatTanggalIndonesia("2026-08-17T00:00:00.000Z");
    expect(result).toMatch(/Agustus/);
    expect(result).toContain("2026");
  });

  it("menerima objek Date maupun string", () => {
    const fromDate = formatTanggalIndonesia(new Date("2026-01-01T00:00:00.000Z"));
    const fromString = formatTanggalIndonesia("2026-01-01T00:00:00.000Z");
    expect(fromDate).toBe(fromString);
  });
});

describe("formatTanggalWaktuIndonesia", () => {
  it("menyertakan jam dan menit", () => {
    const result = formatTanggalWaktuIndonesia("2026-08-17T10:30:00.000Z");
    expect(result).toMatch(/\d{2}[.:]\d{2}/);
  });
});

import { describe, expect, it } from "vitest";
import { getPeriodRange } from "@/lib/domain/sales/period-range";

/**
 * Patokan waktu: Kamis 19 Nov 2026 17:00 WIB = 10:00 UTC. Senin minggu
 * itu 17 Nov; awal bulan 1 Nov; WIB = UTC+7 (17:00 UTC hari sebelumnya).
 */
const NOW = new Date("2026-11-19T10:00:00.000Z");

describe("getPeriodRange (WIB)", () => {
  it("hari: 19 Nov WIB (00:00–24:00 WIB)", () => {
    const range = getPeriodRange("hari", NOW);
    expect(range?.from.toISOString()).toBe("2026-11-18T17:00:00.000Z");
    expect(range?.to.toISOString()).toBe("2026-11-19T17:00:00.000Z");
    expect(range?.label).toContain("Hari ini");
  });

  it("hari memakai tanggal WIB, bukan UTC: 23:30 WIB masih hari yang sama, 00:30 WIB sudah hari baru", () => {
    const late = getPeriodRange("hari", new Date("2026-11-18T16:30:00.000Z"));
    expect(late?.from.toISOString()).toBe("2026-11-17T17:00:00.000Z");
    const early = getPeriodRange("hari", new Date("2026-11-18T17:30:00.000Z"));
    expect(early?.from.toISOString()).toBe("2026-11-18T17:00:00.000Z");
  });

  it("minggu: Senin 16 Nov – Minggu 22 Nov WIB", () => {
    const range = getPeriodRange("minggu", NOW);
    expect(range?.from.toISOString()).toBe("2026-11-15T17:00:00.000Z");
    expect(range?.to.toISOString()).toBe("2026-11-22T17:00:00.000Z");
    expect(range?.label).toContain("Minggu ini");
  });

  it("bulan: 1–30 Nov 2026 WIB", () => {
    const range = getPeriodRange("bulan", NOW);
    expect(range?.from.toISOString()).toBe("2026-10-31T17:00:00.000Z");
    expect(range?.to.toISOString()).toBe("2026-11-30T17:00:00.000Z");
    expect(range?.label).toContain("Bulan ini");
    expect(range?.label).toContain("November 2026");
  });

  it("semua: tanpa batas", () => {
    expect(getPeriodRange("semua", NOW)).toBeNull();
  });

  it("custom: 10–12 Nov WIB", () => {
    const range = getPeriodRange("custom", NOW, { from: "2026-11-10", to: "2026-11-12" });
    expect(range?.from.toISOString()).toBe("2026-11-09T17:00:00.000Z");
    expect(range?.to.toISOString()).toBe("2026-11-12T17:00:00.000Z");
  });

  it("custom hanya tanggal awal: satu hari itu saja", () => {
    const range = getPeriodRange("custom", NOW, { from: "2026-11-10" });
    expect(range?.from.toISOString()).toBe("2026-11-09T17:00:00.000Z");
    expect(range?.to.toISOString()).toBe("2026-11-10T17:00:00.000Z");
  });

  it("custom tidak valid (akhir sebelum awal / tanggal tidak ada) jatuh ke bulan ini", () => {
    const reversed = getPeriodRange("custom", NOW, { from: "2026-11-12", to: "2026-11-10" });
    expect(reversed?.from.toISOString()).toBe("2026-10-31T17:00:00.000Z");
    const bogus = getPeriodRange("custom", NOW, { from: "2026-02-30" });
    expect(bogus?.from.toISOString()).toBe("2026-10-31T17:00:00.000Z");
  });
});

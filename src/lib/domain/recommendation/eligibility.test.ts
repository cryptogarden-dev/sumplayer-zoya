import { describe, expect, it } from "vitest";
import { evaluateEligibility } from "@/lib/domain/recommendation/eligibility";

const certainSufficientStock = {
  meetsNeed: true,
  isCertain: true,
  reason: "Stok tersedia mencukupi.",
};

describe("evaluateEligibility (R14)", () => {
  it("layak jika seluruh syarat terpenuhi dengan pasti", () => {
    const result = evaluateEligibility({
      servesDestination: true,
      stock: certainSufficientStock,
      arrivesInTime: true,
    });
    expect(result.eligible).toBe(true);
    expect(result.blockingReasons).toHaveLength(0);
    expect(result.cautionNotes).toHaveLength(0);
  });

  it("tidak layak (blocking) jika supplier tidak melayani area tujuan", () => {
    const result = evaluateEligibility({
      servesDestination: false,
      stock: certainSufficientStock,
      arrivesInTime: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.blockingReasons.some((r) => /tidak melayani area/i.test(r))).toBe(true);
  });

  it("tidak layak (blocking) jika stok kosong/kurang secara pasti — stok kosong tidak boleh direkomendasikan", () => {
    const result = evaluateEligibility({
      servesDestination: true,
      stock: {
        meetsNeed: false,
        isCertain: true,
        reason: "Stok kosong, tidak dapat memenuhi kebutuhan.",
      },
      arrivesInTime: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.blockingReasons).toContain("Stok kosong, tidak dapat memenuhi kebutuhan.");
  });

  it("tidak layak (blocking) jika estimasi tiba melewati tanggal kebutuhan", () => {
    const result = evaluateEligibility({
      servesDestination: true,
      stock: certainSufficientStock,
      arrivesInTime: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.blockingReasons.some((r) => /melebihi tanggal kebutuhan/i.test(r))).toBe(true);
  });

  it("tidak layak namun bukan blocking (butuh konfirmasi) jika area belum diketahui", () => {
    const result = evaluateEligibility({
      servesDestination: "UNKNOWN",
      stock: certainSufficientStock,
      arrivesInTime: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.blockingReasons).toHaveLength(0);
    expect(result.cautionNotes.length).toBeGreaterThan(0);
  });

  it("catatan tambahan (mis. data lama) mencegah status layak penuh tanpa memblokir", () => {
    const result = evaluateEligibility({
      servesDestination: true,
      stock: certainSufficientStock,
      arrivesInTime: true,
      additionalCautionNotes: ["Harga sudah 30 hari tidak diperbarui."],
    });
    expect(result.eligible).toBe(false);
    expect(result.blockingReasons).toHaveLength(0);
    expect(result.cautionNotes).toContain("Harga sudah 30 hari tidak diperbarui.");
  });

  it("tidak layak namun bukan blocking jika stok perlu konfirmasi (tidak pasti)", () => {
    const result = evaluateEligibility({
      servesDestination: true,
      stock: {
        meetsNeed: false,
        isCertain: false,
        reason: "Ketersediaan perlu dikonfirmasi ke supplier; belum dapat dipastikan mencukupi.",
      },
      arrivesInTime: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.blockingReasons).toHaveLength(0);
    expect(result.cautionNotes.length).toBeGreaterThan(0);
  });
});

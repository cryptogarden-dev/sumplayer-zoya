import { describe, expect, it } from "vitest";
import { evaluateStock } from "@/lib/domain/pricing/stock";
import { InvalidQuantityError } from "@/lib/domain/errors/domain-errors";

describe("evaluateStock", () => {
  it("kasus uji #19: stok kosong tidak memenuhi kebutuhan", () => {
    const result = evaluateStock({ availabilityStatus: "KOSONG", packagesNeeded: 5 });
    expect(result.meetsNeed).toBe(false);
    expect(result.isCertain).toBe(true);
  });

  it("kasus uji #20: stok kurang (tersedia < kebutuhan) ditandai tidak cukup", () => {
    const result = evaluateStock({
      availabilityStatus: "TERSEDIA",
      availablePackages: 3,
      packagesNeeded: 5,
    });
    expect(result.meetsNeed).toBe(false);
    expect(result.isCertain).toBe(true);
  });

  it("kasus uji #20b: stok terbatas namun cukup tetap dianggap memenuhi", () => {
    const result = evaluateStock({
      availabilityStatus: "STOK_TERBATAS",
      availablePackages: 5,
      packagesNeeded: 5,
    });
    expect(result.meetsNeed).toBe(true);
  });

  it("stok tersedia mencukupi kebutuhan", () => {
    const result = evaluateStock({
      availabilityStatus: "TERSEDIA",
      availablePackages: 10,
      packagesNeeded: 5,
    });
    expect(result.meetsNeed).toBe(true);
    expect(result.isCertain).toBe(true);
  });

  it('poin 9: status "PERLU_KONFIRMASI" TIDAK dianggap sebagai stok pasti tersedia', () => {
    const result = evaluateStock({ availabilityStatus: "PERLU_KONFIRMASI", packagesNeeded: 5 });
    expect(result.meetsNeed).toBe(false);
    expect(result.isCertain).toBe(false);
  });

  it("pre-order tidak dianggap pasti dapat memenuhi kebutuhan", () => {
    const result = evaluateStock({ availabilityStatus: "PRE_ORDER", packagesNeeded: 5 });
    expect(result.meetsNeed).toBe(false);
    expect(result.isCertain).toBe(false);
  });

  it("menolak jumlah kemasan dibutuhkan nol atau negatif", () => {
    expect(() => evaluateStock({ availabilityStatus: "TERSEDIA", packagesNeeded: 0 })).toThrow(
      InvalidQuantityError,
    );
    expect(() => evaluateStock({ availabilityStatus: "TERSEDIA", packagesNeeded: -1 })).toThrow(
      InvalidQuantityError,
    );
  });
});

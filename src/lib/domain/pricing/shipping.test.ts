import { describe, expect, it } from "vitest";
import { calculateShipping } from "@/lib/domain/pricing/shipping";
import { InvalidConfigurationError } from "@/lib/domain/errors/domain-errors";

describe("calculateShipping", () => {
  it("kasus uji #16: gratis ongkir tanpa syarat selalu nol berapa pun subtotalnya", () => {
    const low = calculateShipping({ mode: "GRATIS_TANPA_SYARAT", subtotal: 1_000 });
    const high = calculateShipping({ mode: "GRATIS_TANPA_SYARAT", subtotal: 10_000_000 });

    expect(low.fee?.toNumber()).toBe(0);
    expect(high.fee?.toNumber()).toBe(0);
    expect(low.isFreeShipping).toBe(true);
  });

  it("kasus uji #14: subtotal TEPAT pada batas gratis ongkir menghasilkan ongkir nol", () => {
    const result = calculateShipping({
      mode: "GRATIS_MIN_PEMBELIAN",
      subtotal: 300_000,
      freeShippingMinAmount: 300_000,
      flatFee: 20_000,
    });

    expect(result.fee?.toNumber()).toBe(0);
    expect(result.isFreeShipping).toBe(true);
  });

  it("kasus uji #15: subtotal di bawah batas menggunakan ongkir normal", () => {
    const result = calculateShipping({
      mode: "GRATIS_MIN_PEMBELIAN",
      subtotal: 299_999,
      freeShippingMinAmount: 300_000,
      flatFee: 20_000,
    });

    expect(result.fee?.toNumber()).toBe(20_000);
    expect(result.isFreeShipping).toBe(false);
  });

  it("kasus uji #17: pickup menghasilkan ongkir nol dan label pickup", () => {
    const result = calculateShipping({ mode: "PICKUP", subtotal: 500_000 });

    expect(result.fee?.toNumber()).toBe(0);
    expect(result.isPickup).toBe(true);
    expect(result.label).toBe("Pickup");
  });

  it("kasus uji #18: ongkir perlu dikonfirmasi tidak boleh dianggap nol", () => {
    const result = calculateShipping({ mode: "PERLU_KONFIRMASI", subtotal: 500_000 });

    expect(result.fee).toBeNull();
    expect(result.requiresConfirmation).toBe(true);
  });

  it("mode TETAP mengembalikan ongkir sesuai nilai tetap", () => {
    const result = calculateShipping({ mode: "TETAP", subtotal: 100_000, flatFee: 15_000 });
    expect(result.fee?.toNumber()).toBe(15_000);
  });

  it("mode BERDASARKAN_AREA mengembalikan ongkir sesuai area yang di-resolve pemanggil", () => {
    const result = calculateShipping({
      mode: "BERDASARKAN_AREA",
      subtotal: 100_000,
      areaFee: 25_000,
    });
    expect(result.fee?.toNumber()).toBe(25_000);
  });

  it("melempar error konfigurasi jika parameter wajib mode tertentu tidak diisi", () => {
    expect(() => calculateShipping({ mode: "TETAP", subtotal: 100_000 })).toThrow(
      InvalidConfigurationError,
    );
    expect(() => calculateShipping({ mode: "BERDASARKAN_AREA", subtotal: 100_000 })).toThrow(
      InvalidConfigurationError,
    );
    expect(() => calculateShipping({ mode: "GRATIS_MIN_PEMBELIAN", subtotal: 100_000 })).toThrow(
      InvalidConfigurationError,
    );
  });
});

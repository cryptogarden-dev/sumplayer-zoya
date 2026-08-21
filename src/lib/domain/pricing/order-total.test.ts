import { describe, expect, it } from "vitest";
import { calculateOrderTotal } from "@/lib/domain/pricing/order-total";
import { calculateShipping } from "@/lib/domain/pricing/shipping";
import { InvalidQuantityError } from "@/lib/domain/errors/domain-errors";

describe("calculateOrderTotal", () => {
  it("menghitung total biaya dan harga akhir per satuan dasar dengan ongkir tetap", () => {
    const shipping = calculateShipping({ mode: "TETAP", subtotal: 375_000, flatFee: 25_000 });
    const result = calculateOrderTotal({
      subtotalAfterTax: 375_000,
      shipping,
      actualQuantityInBaseUnit: 25, // 1 karung 25 kg
    });

    expect(result.totalCost?.toNumber()).toBe(400_000);
    expect(result.finalPricePerBaseUnit?.toNumber()).toBe(16_000); // 400.000 / 25 kg
  });

  it("gratis ongkir tidak menambah total biaya", () => {
    const shipping = calculateShipping({ mode: "GRATIS_TANPA_SYARAT", subtotal: 204_000 });
    const result = calculateOrderTotal({
      subtotalAfterTax: 204_000,
      shipping,
      actualQuantityInBaseUnit: 12,
    });

    expect(result.totalCost?.toNumber()).toBe(204_000);
    expect(result.finalPricePerBaseUnit?.toNumber()).toBe(17_000);
  });

  it("kasus uji #18 (lanjutan): ongkir PERLU_KONFIRMASI membuat total & harga akhir belum pasti (null), bukan nol", () => {
    const shipping = calculateShipping({ mode: "PERLU_KONFIRMASI", subtotal: 240_000 });
    const result = calculateOrderTotal({
      subtotalAfterTax: 240_000,
      shipping,
      actualQuantityInBaseUnit: 24,
    });

    expect(result.shippingFee).toBeNull();
    expect(result.totalCost).toBeNull();
    expect(result.finalPricePerBaseUnit).toBeNull();
    expect(result.requiresShippingConfirmation).toBe(true);
  });

  it("menolak jumlah aktual nol atau negatif", () => {
    const shipping = calculateShipping({ mode: "PICKUP", subtotal: 100_000 });
    expect(() =>
      calculateOrderTotal({ subtotalAfterTax: 100_000, shipping, actualQuantityInBaseUnit: 0 }),
    ).toThrow(InvalidQuantityError);
  });
});

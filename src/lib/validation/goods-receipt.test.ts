import { describe, expect, it } from "vitest";
import { goodsReceiptInputSchema } from "@/lib/validation/goods-receipt";

function baseItem(overrides: Record<string, unknown> = {}) {
  return {
    purchaseOrderItemId: "00000000-0000-4000-8000-000000000001",
    receivedQty: 2,
    conditionGoodQty: 2,
    conditionDamagedQty: 0,
    priceMatches: true,
    ...overrides,
  };
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return { items: [baseItem()], onTime: true, ...overrides };
}

describe("goodsReceiptInputSchema (R18)", () => {
  it("menerima penerimaan lengkap dengan harga sesuai", () => {
    expect(goodsReceiptInputSchema.safeParse(baseInput()).success).toBe(true);
  });

  it("menolak bila baik + rusak lebih dari diterima", () => {
    const parsed = goodsReceiptInputSchema.safeParse(
      baseInput({
        items: [baseItem({ receivedQty: 2, conditionGoodQty: 2, conditionDamagedQty: 1 })],
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("menerima baik + rusak sama dengan diterima", () => {
    const parsed = goodsReceiptInputSchema.safeParse(
      baseInput({
        items: [baseItem({ receivedQty: 2, conditionGoodQty: 1, conditionDamagedQty: 1 })],
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it("menolak priceMatches=false tanpa harga sebenarnya", () => {
    const parsed = goodsReceiptInputSchema.safeParse(
      baseInput({ items: [baseItem({ priceMatches: false })] }),
    );
    expect(parsed.success).toBe(false);
  });

  it("menerima priceMatches=false bila harga sebenarnya diisi", () => {
    const parsed = goodsReceiptInputSchema.safeParse(
      baseInput({
        items: [baseItem({ priceMatches: false, actualPricePerPackage: 65000 })],
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it("menolak harga sebenarnya nol atau negatif", () => {
    const parsed = goodsReceiptInputSchema.safeParse(
      baseInput({
        items: [baseItem({ priceMatches: false, actualPricePerPackage: 0 })],
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("menolak bila total diterima 0", () => {
    const parsed = goodsReceiptInputSchema.safeParse(
      baseInput({ items: [baseItem({ receivedQty: 0, conditionGoodQty: 0 })] }),
    );
    expect(parsed.success).toBe(false);
  });

  it("menolak bila tidak ada baris produk", () => {
    const parsed = goodsReceiptInputSchema.safeParse(baseInput({ items: [] }));
    expect(parsed.success).toBe(false);
  });

  it("menolak jumlah negatif", () => {
    const parsed = goodsReceiptInputSchema.safeParse(
      baseInput({ items: [baseItem({ receivedQty: -1 })] }),
    );
    expect(parsed.success).toBe(false);
  });
});

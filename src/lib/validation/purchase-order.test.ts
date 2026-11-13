import { describe, expect, it } from "vitest";
import { confirmPurchaseOrderSchema, recordPaymentSchema } from "@/lib/validation/purchase-order";

describe("confirmPurchaseOrderSchema (perbaikan #4)", () => {
  it("Tunai tanpa jatuh tempo -> lolos", () => {
    expect(confirmPurchaseOrderSchema.safeParse({ paymentMethod: "TUNAI" }).success).toBe(true);
  });

  it("Transfer tanpa jatuh tempo -> lolos", () => {
    expect(confirmPurchaseOrderSchema.safeParse({ paymentMethod: "TRANSFER" }).success).toBe(true);
  });

  it("Tempo tanpa jatuh tempo -> ditolak", () => {
    const result = confirmPurchaseOrderSchema.safeParse({ paymentMethod: "TEMPO" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.paymentDueDate?.[0]).toMatch(/jatuh tempo/i);
    }
  });

  it("Tempo dengan jatuh tempo -> lolos", () => {
    expect(
      confirmPurchaseOrderSchema.safeParse({
        paymentMethod: "TEMPO",
        paymentDueDate: "2026-11-20",
      }).success,
    ).toBe(true);
  });

  it("Tempo dengan tanggal tidak valid -> ditolak", () => {
    expect(
      confirmPurchaseOrderSchema.safeParse({
        paymentMethod: "TEMPO",
        paymentDueDate: "20-11-2026",
      }).success,
    ).toBe(false);
  });
});

describe("recordPaymentSchema (perbaikan #4)", () => {
  it("jumlah positif -> lolos", () => {
    expect(recordPaymentSchema.safeParse({ amount: 50000 }).success).toBe(true);
  });

  it("jumlah nol atau negatif -> ditolak", () => {
    expect(recordPaymentSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ amount: -1000 }).success).toBe(false);
  });
});

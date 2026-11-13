import { describe, expect, it } from "vitest";
import { computePaymentStatus, computeRemainingAmount } from "@/lib/domain/orders/payment";

describe("computePaymentStatus (perbaikan #4)", () => {
  it("belum ada yang dibayar -> BELUM_BAYAR", () => {
    expect(computePaymentStatus(0, 120000)).toBe("BELUM_BAYAR");
  });

  it("dibayar sebagian -> DP", () => {
    expect(computePaymentStatus(50000, 120000)).toBe("DP");
  });

  it("dibayar tepat total -> LUNAS", () => {
    expect(computePaymentStatus(120000, 120000)).toBe("LUNAS");
  });

  it("dibayar dua kali (DP lalu pelunasan) -> LUNAS", () => {
    expect(computePaymentStatus(50000 + 70000, 120000)).toBe("LUNAS");
  });

  it("total pesanan 0 dan belum dibayar -> BELUM_BAYAR", () => {
    expect(computePaymentStatus(0, 0)).toBe("BELUM_BAYAR");
  });
});

describe("computeRemainingAmount (perbaikan #4)", () => {
  it("sisa = total - sudah dibayar", () => {
    expect(computeRemainingAmount(120000, 50000).toNumber()).toBe(70000);
  });

  it("lunas -> sisa 0, bukan negatif", () => {
    expect(computeRemainingAmount(120000, 120000).toNumber()).toBe(0);
    expect(computeRemainingAmount(120000, 150000).toNumber()).toBe(0);
  });
});

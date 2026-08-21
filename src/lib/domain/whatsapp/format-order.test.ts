import { describe, expect, it } from "vitest";
import {
  buildWhatsAppLink,
  formatWhatsAppOrderMessage,
  toWhatsAppDigits,
} from "@/lib/domain/whatsapp/format-order";

describe("formatWhatsAppOrderMessage (R17)", () => {
  it("menyertakan nama produk, jumlah kemasan, dan estimasi total", () => {
    const message = formatWhatsAppOrderMessage({
      supplierName: "CV Sumber Pangan",
      productName: "Beras Premium",
      packageTypeLabel: "Karung",
      packagesToBuy: 2,
      actualQuantity: 50,
      baseUnitLabel: "kg",
      totalCost: 750000,
      neededByDate: new Date("2026-08-25"),
    });

    expect(message).toContain("CV Sumber Pangan");
    expect(message).toContain("Beras Premium");
    expect(message).toContain("2 Karung");
    expect(message).toContain("50 kg");
    expect(message).toMatch(/Rp\s?750\.000/);
  });

  it("tidak menampilkan total sebagai nol saat ongkir belum diketahui — memakai teks eksplisit", () => {
    const message = formatWhatsAppOrderMessage({
      supplierName: "CV Sumber Pangan",
      productName: "Beras Premium",
      packageTypeLabel: "Karung",
      packagesToBuy: 2,
      actualQuantity: 50,
      baseUnitLabel: "kg",
      totalCost: null,
      neededByDate: new Date("2026-08-25"),
    });
    expect(message).toContain("menunggu konfirmasi ongkir");
    expect(message).not.toContain("Rp0");
  });

  it("menyertakan catatan bila diisi", () => {
    const message = formatWhatsAppOrderMessage({
      supplierName: "CV Sumber Pangan",
      productName: "Beras Premium",
      packageTypeLabel: "Karung",
      packagesToBuy: 1,
      actualQuantity: 25,
      baseUnitLabel: "kg",
      totalCost: 375000,
      neededByDate: new Date("2026-08-25"),
      notes: "Tolong kirim pagi hari",
    });
    expect(message).toContain("Tolong kirim pagi hari");
  });
});

describe("toWhatsAppDigits", () => {
  it("mengonversi awalan 08 menjadi 628", () => {
    expect(toWhatsAppDigits("081234567890")).toBe("6281234567890");
  });

  it("menerima format +628 dan 628 apa adanya (tanpa plus)", () => {
    expect(toWhatsAppDigits("+6281234567890")).toBe("6281234567890");
    expect(toWhatsAppDigits("6281234567890")).toBe("6281234567890");
  });

  it("menolak format yang tidak valid", () => {
    expect(() => toWhatsAppDigits("123")).toThrow();
    expect(() => toWhatsAppDigits("abcdef")).toThrow();
  });
});

describe("buildWhatsAppLink", () => {
  it("membangun tautan wa.me dengan teks ter-encode", () => {
    const link = buildWhatsAppLink("081234567890", "Halo dunia");
    expect(link).toBe("https://wa.me/6281234567890?text=Halo%20dunia");
  });
});

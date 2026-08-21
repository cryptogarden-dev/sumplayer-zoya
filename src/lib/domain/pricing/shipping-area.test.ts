import { describe, expect, it } from "vitest";
import { resolveAreaFee } from "@/lib/domain/pricing/shipping-area";

describe("resolveAreaFee (R08 BERDASARKAN_AREA)", () => {
  it("mengembalikan tarif yang cocok kota & provinsi", () => {
    const fee = resolveAreaFee(
      [
        { province: "DKI Jakarta", city: "Jakarta Timur", fee: 20000 },
        { province: "DKI Jakarta", city: "Jakarta Barat", fee: 25000 },
      ],
      { province: "DKI Jakarta", city: "Jakarta Timur" },
    );
    expect(fee?.toNumber()).toBe(20000);
  });

  it("mengembalikan tarif provinsi (tanpa kota spesifik) sebagai fallback", () => {
    const fee = resolveAreaFee([{ province: "Jawa Barat", city: null, fee: 30000 }], {
      province: "Jawa Barat",
      city: "Bandung",
    });
    expect(fee?.toNumber()).toBe(30000);
  });

  it("mengembalikan null (BUKAN nol) jika tidak ada tarif area yang cocok — belum diatur untuk tujuan ini", () => {
    const fee = resolveAreaFee([{ province: "Jawa Barat", city: "Bandung", fee: 30000 }], {
      province: "DKI Jakarta",
      city: "Jakarta Timur",
    });
    expect(fee).toBeNull();
  });
});

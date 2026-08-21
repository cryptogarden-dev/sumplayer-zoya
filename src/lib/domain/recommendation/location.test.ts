import { describe, expect, it } from "vitest";
import { evaluateProximity, evaluateServesDestination } from "@/lib/domain/recommendation/location";

describe("evaluateServesDestination (R14)", () => {
  it("mengembalikan UNKNOWN jika supplier belum mendaftarkan area apa pun", () => {
    expect(evaluateServesDestination([], { province: "DKI Jakarta", city: "Jakarta Timur" })).toBe(
      "UNKNOWN",
    );
  });

  it("true jika ada area yang cocok provinsi & kota", () => {
    const areas = [{ province: "DKI Jakarta", city: "Jakarta Timur" }];
    expect(
      evaluateServesDestination(areas, { province: "DKI Jakarta", city: "Jakarta Timur" }),
    ).toBe(true);
  });

  it("false jika tidak ada area yang cocok (supplier di luar area tujuan)", () => {
    const areas = [{ province: "Jawa Barat", city: "Bandung" }];
    expect(
      evaluateServesDestination(areas, { province: "DKI Jakarta", city: "Jakarta Timur" }),
    ).toBe(false);
  });

  it("tidak sensitif huruf besar/kecil", () => {
    const areas = [{ province: "dki jakarta" }];
    expect(evaluateServesDestination(areas, { province: "DKI JAKARTA" })).toBe(true);
  });
});

describe("evaluateProximity (R13 'Paling Dekat')", () => {
  it("kota supplier sama dengan tujuan -> level CITY, skor terkecil", () => {
    const result = evaluateProximity("Jakarta Timur", [], {
      province: "DKI Jakarta",
      city: "Jakarta Timur",
    });
    expect(result.level).toBe("CITY");
    expect(result.score).toBe(0);
  });

  it("area pengiriman mencakup kota tujuan -> level CITY", () => {
    const result = evaluateProximity(
      "Bandung",
      [{ province: "DKI Jakarta", city: "Jakarta Timur" }],
      {
        province: "DKI Jakarta",
        city: "Jakarta Timur",
      },
    );
    expect(result.level).toBe("CITY");
  });

  it("hanya cocok provinsi -> level PROVINCE", () => {
    const result = evaluateProximity("Bekasi", [{ province: "DKI Jakarta" }], {
      province: "DKI Jakarta",
      city: "Jakarta Pusat",
    });
    expect(result.level).toBe("PROVINCE");
    expect(result.score).toBe(1);
  });

  it("tidak ada kecocokan sama sekali -> NONE, skor null (tidak dipaksakan)", () => {
    const result = evaluateProximity("Surabaya", [{ province: "Jawa Timur" }], {
      province: "DKI Jakarta",
      city: "Jakarta Pusat",
    });
    expect(result.level).toBe("NONE");
    expect(result.score).toBeNull();
  });
});

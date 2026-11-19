import { describe, expect, it } from "vitest";
import { displayUnitLabel } from "@/lib/format/units";

describe("displayUnitLabel", () => {
  it("PCS + penawaran Renceng → Renceng", () => {
    expect(displayUnitLabel("PCS", [{ packageType: "RENCENG" }])).toBe("Renceng");
  });

  it("PCS + penawaran Pak → pcs", () => {
    expect(displayUnitLabel("PCS", [{ packageType: "PAK" }])).toBe("pcs");
  });

  it("PCS tanpa penawaran → pcs", () => {
    expect(displayUnitLabel("PCS", [])).toBe("pcs");
  });

  it("KILOGRAM + penawaran Renceng → kg (aturan hanya untuk hitungan)", () => {
    expect(displayUnitLabel("KILOGRAM", [{ packageType: "RENCENG" }])).toBe("kg");
  });
});

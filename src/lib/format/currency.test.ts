import { describe, expect, it } from "vitest";
import { formatRupiah } from "@/lib/format/currency";

describe("formatRupiah (R24 - format mata uang Indonesia)", () => {
  it("memformat angka menjadi Rupiah tanpa desimal", () => {
    expect(formatRupiah(15000)).toContain("15.000");
    expect(formatRupiah(15000)).toContain("Rp");
  });

  it("memformat nol dengan benar", () => {
    expect(formatRupiah(0)).toContain("0");
  });

  it("menerima input string angka", () => {
    expect(formatRupiah("375000")).toContain("375.000");
  });

  it("tidak melempar galat untuk input tidak valid, jatuh ke nol", () => {
    expect(formatRupiah(Number.NaN)).toContain("0");
  });
});

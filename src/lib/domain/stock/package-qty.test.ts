import { describe, expect, it } from "vitest";
import {
  displayPackageContent,
  toBaseQty,
  toDisplayQty,
  type PackageOfferInput,
} from "@/lib/domain/stock/package-qty";

const goodDayOffers: PackageOfferInput[] = [
  { packageType: "RENCENG", totalPackageContent: 10, pricePerPackage: 11500 },
];

const noRencengOffers: PackageOfferInput[] = [
  { packageType: "KARUNG", totalPackageContent: 5, pricePerPackage: 60000 },
  { packageType: "PAK", totalPackageContent: 1, pricePerPackage: 23000 },
];

describe("displayPackageContent", () => {
  it("renceng 10 pcs -> 10", () => {
    expect(displayPackageContent(goodDayOffers)).toBe(10);
  });

  it("tanpa penawaran Renceng -> 1", () => {
    expect(displayPackageContent(noRencengOffers)).toBe(1);
    expect(displayPackageContent([])).toBe(1);
  });

  it("beberapa penawaran Renceng -> yang termurah per pcs", () => {
    expect(
      displayPackageContent([
        { packageType: "RENCENG", totalPackageContent: 5, pricePerPackage: 6000 },
        { packageType: "RENCENG", totalPackageContent: 10, pricePerPackage: 11500 },
      ]),
    ).toBe(10);
  });
});

describe("toDisplayQty / toBaseQty (Kopi Good Day: 1 renceng = 10 pcs)", () => {
  it("30 pcs -> 3 renceng", () => {
    expect(toDisplayQty(30, 10)).toBe(3);
  });

  it("28 pcs -> 2,8 renceng (jual 2 pcs dari 30)", () => {
    expect(toDisplayQty(28, 10)).toBe(2.8);
  });

  it("3 renceng -> 30 pcs", () => {
    expect(toBaseQty(3, 10)).toBe(30);
  });

  it("2,5 renceng -> 25 pcs", () => {
    expect(toBaseQty(2.5, 10)).toBe(25);
  });

  it("tanpa kemasan (isi 1) jumlah tidak berubah", () => {
    expect(toDisplayQty(10, 1)).toBe(10);
    expect(toBaseQty(10, 1)).toBe(10);
  });
});

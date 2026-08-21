import { describe, expect, it } from "vitest";
import { calculatePurchaseQuantity } from "@/lib/domain/pricing/packages";
import { InvalidQuantityError } from "@/lib/domain/errors/domain-errors";

describe("calculatePurchaseQuantity", () => {
  it("kasus uji #7: kebutuhan 20 kg, kemasan 25 kg -> 1 kemasan, aktual 25 kg", () => {
    const result = calculatePurchaseQuantity({
      neededQuantityInBaseUnit: 20,
      contentPerPackageInBaseUnit: 25,
    });

    expect(result.packagesRequiredRaw.toNumber()).toBe(1);
    expect(result.packagesToBuy.toNumber()).toBe(1);
    expect(result.actualQuantityInBaseUnit.toNumber()).toBe(25);
    expect(result.excessQuantityInBaseUnit.toNumber()).toBe(5);
  });

  it("kasus uji #8: kebutuhan 26 kg, kemasan 25 kg -> 2 kemasan, aktual 50 kg", () => {
    const result = calculatePurchaseQuantity({
      neededQuantityInBaseUnit: 26,
      contentPerPackageInBaseUnit: 25,
    });

    expect(result.packagesRequiredRaw.toNumber()).toBe(2);
    expect(result.packagesToBuy.toNumber()).toBe(2);
    expect(result.actualQuantityInBaseUnit.toNumber()).toBe(50);
    expect(result.excessQuantityInBaseUnit.toNumber()).toBe(24);
  });

  it("kasus uji #9: minimum pembelian 3 dus tidak boleh menghasilkan kurang dari 3 dus", () => {
    // Kebutuhan hanya butuh 1 dus (isi 10 per dus), tapi minimum 3 dus.
    const result = calculatePurchaseQuantity({
      neededQuantityInBaseUnit: 5,
      contentPerPackageInBaseUnit: 10,
      minimumPurchasePackages: 3,
    });

    expect(result.packagesRequiredRaw.toNumber()).toBe(1);
    expect(result.packagesToBuy.toNumber()).toBe(3);
    expect(result.actualQuantityInBaseUnit.toNumber()).toBe(30);
  });

  it("kasus uji #9b: jika kebutuhan sudah melebihi minimum, minimum tidak berlaku", () => {
    const result = calculatePurchaseQuantity({
      neededQuantityInBaseUnit: 45,
      contentPerPackageInBaseUnit: 10,
      minimumPurchasePackages: 3,
    });

    // ceil(45/10) = 5, sudah di atas minimum 3.
    expect(result.packagesToBuy.toNumber()).toBe(5);
  });

  it("kasus uji #10: kelipatan 2 menghasilkan 2, 4, 6, dan seterusnya", () => {
    const scenarios: Array<[number, number]> = [
      [1, 2], // butuh 1 kemasan -> dibulatkan ke kelipatan 2 terdekat -> 2
      [2, 2],
      [3, 4],
      [4, 4],
      [5, 6],
      [6, 6],
    ];

    for (const [rawPackagesNeeded, expectedPackagesToBuy] of scenarios) {
      const result = calculatePurchaseQuantity({
        neededQuantityInBaseUnit: rawPackagesNeeded * 10,
        contentPerPackageInBaseUnit: 10,
        purchaseMultiple: 2,
      });
      expect(result.packagesToBuy.toNumber()).toBe(expectedPackagesToBuy);
    }
  });

  it("menggabungkan minimum DAN kelipatan sekaligus", () => {
    // Butuh 1 kemasan, minimum 3, kelipatan 2 -> max(1,3)=3 -> dibulatkan ke kelipatan 2 -> 4
    const result = calculatePurchaseQuantity({
      neededQuantityInBaseUnit: 5,
      contentPerPackageInBaseUnit: 10,
      minimumPurchasePackages: 3,
      purchaseMultiple: 2,
    });

    expect(result.packagesToBuy.toNumber()).toBe(4);
  });

  it("menolak kebutuhan nol atau negatif", () => {
    expect(() =>
      calculatePurchaseQuantity({ neededQuantityInBaseUnit: 0, contentPerPackageInBaseUnit: 10 }),
    ).toThrow(InvalidQuantityError);
    expect(() =>
      calculatePurchaseQuantity({ neededQuantityInBaseUnit: -5, contentPerPackageInBaseUnit: 10 }),
    ).toThrow(InvalidQuantityError);
  });

  it("menolak isi per kemasan nol atau negatif", () => {
    expect(() =>
      calculatePurchaseQuantity({ neededQuantityInBaseUnit: 10, contentPerPackageInBaseUnit: 0 }),
    ).toThrow(InvalidQuantityError);
  });

  it("menolak kelipatan pembelian yang bukan bilangan bulat", () => {
    expect(() =>
      calculatePurchaseQuantity({
        neededQuantityInBaseUnit: 10,
        contentPerPackageInBaseUnit: 10,
        purchaseMultiple: 1.5,
      }),
    ).toThrow(InvalidQuantityError);
  });
});

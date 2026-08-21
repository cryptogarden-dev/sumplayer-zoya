import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestBusiness,
  deleteTestBusiness,
  type TestBusinessContext,
} from "@/tests/db-helpers";
import {
  createSupplier,
  replaceSupplierDeliveryAreas,
  upsertShippingRule,
} from "@/lib/server/repositories/supplier-repository";
import { createProduct } from "@/lib/server/repositories/product-repository";
import { createOffer, upsertStock } from "@/lib/server/repositories/supplier-product-repository";
import { createTaxRate } from "@/lib/server/repositories/tax-rate-repository";
import type { SupplierInput } from "@/lib/validation/supplier";
import type { ProductInput } from "@/lib/validation/product";
import type { SupplierProductInput } from "@/lib/validation/supplier-product";
import { buildComparison, ProductNotFoundError } from "@/lib/server/comparison/build-comparison";
import { IncompatibleUnitError } from "@/lib/domain";
import { LABEL } from "@/lib/domain/recommendation/labels";

const DESTINATION = { province: "DKI Jakarta", city: "Jakarta Timur" };
const TODAY = new Date("2026-08-18");
const NEEDED_BY_DATE = new Date("2026-08-25");

function baseSupplierInput(overrides: Partial<SupplierInput> = {}): SupplierInput {
  return {
    supplierName: "Supplier Uji",
    phoneNumber: "081234567890",
    address: "Jl. Contoh No. 1",
    province: DESTINATION.province,
    city: DESTINATION.city,
    leadTimeDaysMin: 1,
    leadTimeDaysMax: 2,
    ...overrides,
  } as SupplierInput;
}

function baseOfferInput(overrides: Partial<SupplierProductInput> = {}): SupplierProductInput {
  return {
    supplierId: "",
    productId: "",
    packageType: "KARUNG",
    itemsPerPackage: 1,
    contentPerItem: 25,
    contentUnit: "KILOGRAM",
    minPurchasePackages: 1,
    purchaseMultiplePackages: 1,
    price: { pricePerPackage: 375000, taxStatus: "NONE" },
    stock: { availabilityStatus: "TERSEDIA", stockQty: 100 },
    ...overrides,
  } as SupplierProductInput;
}

describe("buildComparison — alur utama halaman Bandingkan (Tahap 4)", () => {
  let ctx: TestBusinessContext;
  let otherCtx: TestBusinessContext;
  let productId: string;

  beforeAll(async () => {
    ctx = await createTestBusiness("Bandingkan A");
    otherCtx = await createTestBusiness("Bandingkan B");

    const product = await createProduct(ctx.businessId, ctx.ownerUserId, {
      sku: "BERAS-PREMIUM",
      productName: "Beras Premium",
      unitFamily: "WEIGHT",
    } as ProductInput);
    productId = product.id;
  });

  afterAll(async () => {
    await deleteTestBusiness(ctx.businessId);
    await deleteTestBusiness(otherCtx.businessId);
  });

  it("kasus #1: kebutuhan 20kg pada kemasan 25kg dan 10kg — jumlah kemasan & kelebihan pembulatan benar", async () => {
    const supplierA = await createSupplier(
      ctx.businessId,
      ctx.ownerUserId,
      baseSupplierInput({ supplierName: "Karung 25kg" }),
    );
    await replaceSupplierDeliveryAreas(ctx.businessId, supplierA.id, [DESTINATION]);
    await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({
        supplierId: supplierA.id,
        productId,
        packageType: "KARUNG",
        itemsPerPackage: 1,
        contentPerItem: 25,
        contentUnit: "KILOGRAM",
      }),
    );

    const supplierB = await createSupplier(
      ctx.businessId,
      ctx.ownerUserId,
      baseSupplierInput({ supplierName: "Karung 10kg" }),
    );
    await replaceSupplierDeliveryAreas(ctx.businessId, supplierB.id, [DESTINATION]);
    await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({
        supplierId: supplierB.id,
        productId,
        packageType: "KARUNG",
        itemsPerPackage: 1,
        contentPerItem: 10,
        contentUnit: "KILOGRAM",
        price: { pricePerPackage: 150000, taxStatus: "NONE" },
      }),
    );

    const result = await buildComparison({
      businessId: ctx.businessId,
      productId,
      neededQuantity: 20,
      neededUnit: "KILOGRAM",
      destination: DESTINATION,
      neededByDate: NEEDED_BY_DATE,
      today: TODAY,
    });

    const rowA = result.rows.find((r) => r.supplier.name === "Karung 25kg")!;
    const rowB = result.rows.find((r) => r.supplier.name === "Karung 10kg")!;

    expect(rowA.purchase.packagesToBuy.toNumber()).toBe(1);
    expect(rowA.purchase.actualQuantityInBaseUnit.toNumber()).toBe(25);
    expect(rowA.purchase.excessQuantityInBaseUnit.toNumber()).toBe(5);

    expect(rowB.purchase.packagesToBuy.toNumber()).toBe(2);
    expect(rowB.purchase.actualQuantityInBaseUnit.toNumber()).toBe(20);
    expect(rowB.purchase.excessQuantityInBaseUnit.toNumber()).toBe(0);
  });

  it("kasus #2: minimum pembelian dinaikkan otomatis & syarat gratis ongkir tepat di batas", async () => {
    const supplier = await createSupplier(
      ctx.businessId,
      ctx.ownerUserId,
      baseSupplierInput({ supplierName: "Min 3 Karung" }),
    );
    await replaceSupplierDeliveryAreas(ctx.businessId, supplier.id, [DESTINATION]);
    await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({
        supplierId: supplier.id,
        productId,
        minPurchasePackages: 3,
        price: { pricePerPackage: 100000, taxStatus: "NONE" },
      }),
    );
    // Subtotal pada 3 karung = 300.000 -> syarat gratis ongkir persis di angka ini.
    await upsertShippingRule(ctx.businessId, supplier.id, ctx.ownerUserId, {
      ruleType: "GRATIS_MIN_PEMBELIAN",
      freeShippingMinAmount: 300000,
      flatFee: 15000,
    });

    const result = await buildComparison({
      businessId: ctx.businessId,
      productId,
      neededQuantity: 20, // Hanya butuh 1 karung (25kg), tapi minimum 3.
      neededUnit: "KILOGRAM",
      destination: DESTINATION,
      neededByDate: NEEDED_BY_DATE,
      today: TODAY,
    });

    const row = result.rows.find((r) => r.supplier.name === "Min 3 Karung")!;
    expect(row.purchase.packagesToBuy.toNumber()).toBe(3);
    expect(row.money.subtotalAfterTax.toNumber()).toBe(300000);
    expect(row.money.isFreeShipping).toBe(true);
    expect(row.money.shippingFee?.toNumber()).toBe(0);
  });

  it("kasus #3: ongkir belum diatur (perlu konfirmasi) TIDAK dianggap nol", async () => {
    const supplier = await createSupplier(
      ctx.businessId,
      ctx.ownerUserId,
      baseSupplierInput({ supplierName: "Tanpa Aturan Ongkir" }),
    );
    await replaceSupplierDeliveryAreas(ctx.businessId, supplier.id, [DESTINATION]);
    await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({ supplierId: supplier.id, productId }),
    );
    // Sengaja TIDAK memanggil upsertShippingRule.

    const result = await buildComparison({
      businessId: ctx.businessId,
      productId,
      neededQuantity: 20,
      neededUnit: "KILOGRAM",
      destination: DESTINATION,
      neededByDate: NEEDED_BY_DATE,
      today: TODAY,
    });

    const row = result.rows.find((r) => r.supplier.name === "Tanpa Aturan Ongkir")!;
    expect(row.money.shippingFee).toBeNull();
    expect(row.money.totalCost).toBeNull();
    expect(row.money.finalPricePerBaseUnit).toBeNull();
    expect(row.money.requiresShippingConfirmation).toBe(true);
    expect(row.needsConfirmation).toBe(true);
    expect(row.eligible).toBe(false);
  });

  it("kasus #4: stok kosong dan di luar area tidak layak direkomendasikan (tetap ditampilkan)", async () => {
    const kosong = await createSupplier(
      ctx.businessId,
      ctx.ownerUserId,
      baseSupplierInput({ supplierName: "Stok Kosong" }),
    );
    await replaceSupplierDeliveryAreas(ctx.businessId, kosong.id, [DESTINATION]);
    await upsertShippingRule(ctx.businessId, kosong.id, ctx.ownerUserId, {
      ruleType: "GRATIS_TANPA_SYARAT",
    });
    const offerKosong = await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({
        supplierId: kosong.id,
        productId,
        stock: { availabilityStatus: "TERSEDIA" },
      }),
    );
    await upsertStock(ctx.businessId, ctx.ownerUserId, offerKosong!.id, {
      availabilityStatus: "KOSONG",
    });

    const luarArea = await createSupplier(
      ctx.businessId,
      ctx.ownerUserId,
      baseSupplierInput({ supplierName: "Luar Area" }),
    );
    await replaceSupplierDeliveryAreas(ctx.businessId, luarArea.id, [
      { province: "Jawa Barat", city: "Bandung" },
    ]);
    await upsertShippingRule(ctx.businessId, luarArea.id, ctx.ownerUserId, {
      ruleType: "GRATIS_TANPA_SYARAT",
    });
    await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({ supplierId: luarArea.id, productId }),
    );

    const result = await buildComparison({
      businessId: ctx.businessId,
      productId,
      neededQuantity: 20,
      neededUnit: "KILOGRAM",
      destination: DESTINATION,
      neededByDate: NEEDED_BY_DATE,
      today: TODAY,
    });

    const rowKosong = result.rows.find((r) => r.supplier.name === "Stok Kosong")!;
    const rowLuarArea = result.rows.find((r) => r.supplier.name === "Luar Area")!;

    expect(rowKosong.eligible).toBe(false);
    expect(rowKosong.blockingReasons.some((r) => /kosong/i.test(r))).toBe(true);
    expect(rowKosong.labels).not.toContain(LABEL.RECOMMENDED);

    expect(rowLuarArea.eligible).toBe(false);
    expect(rowLuarArea.blockingReasons.some((r) => /tidak melayani area/i.test(r))).toBe(true);
    expect(rowLuarArea.labels).not.toContain(LABEL.RECOMMENDED);

    // Tetap tampil untuk perbandingan (bukan difilter otomatis).
    expect(result.rows.some((r) => r.supplier.name === "Stok Kosong")).toBe(true);
    expect(result.rows.some((r) => r.supplier.name === "Luar Area")).toBe(true);
  });

  it("kasus #5: produk dengan dimensi satuan berbeda ditolak, tidak dibandingkan", async () => {
    await expect(
      buildComparison({
        businessId: ctx.businessId,
        productId, // produk berbasis WEIGHT
        neededQuantity: 20,
        neededUnit: "LITER", // family VOLUME - tidak kompatibel
        destination: DESTINATION,
        neededByDate: NEEDED_BY_DATE,
        today: TODAY,
      }),
    ).rejects.toThrow(IncompatibleUnitError);
  });

  it("kasus #6: label harga satuan & total termurah memakai hasil SETELAH pajak & ongkir, bukan harga mentah", async () => {
    // Produk KHUSUS untuk kasus ini (bukan `productId` bersama di atas) agar
    // penawaran dari kasus lain tidak ikut memengaruhi perbandingan "termurah".
    const product6 = await createProduct(ctx.businessId, ctx.ownerUserId, {
      sku: "BERAS-KASUS-6",
      productName: "Beras Kasus 6",
      unitFamily: "WEIGHT",
    } as ProductInput);
    const productId6 = product6.id;

    const taxRate = await createTaxRate(ctx.businessId, ctx.ownerUserId, {
      name: "PPN 20% (uji)",
      ratePercent: 20,
      isDefault: false,
    });

    // Harga mentah LEBIH RENDAH (300.000), tapi kena pajak 20% + ongkir tetap 50.000
    // -> total akhir jadi LEBIH MAHAL daripada supplier pembanding.
    const murahMentah = await createSupplier(
      ctx.businessId,
      ctx.ownerUserId,
      baseSupplierInput({ supplierName: "Murah Mentah" }),
    );
    await replaceSupplierDeliveryAreas(ctx.businessId, murahMentah.id, [DESTINATION]);
    await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({
        supplierId: murahMentah.id,
        productId: productId6,
        price: { pricePerPackage: 300000, taxStatus: "EXCLUDED", taxRateId: taxRate.id },
      }),
    );
    await upsertShippingRule(ctx.businessId, murahMentah.id, ctx.ownerUserId, {
      ruleType: "TETAP",
      flatFee: 50000,
    });
    // subtotal = 300.000 * 1,2 = 360.000; total = 360.000 + 50.000 = 410.000; per kg = 16.400

    // Harga mentah LEBIH TINGGI (340.000), tanpa pajak & gratis ongkir
    // -> total akhir jadi LEBIH MURAH secara riil.
    const mahalMentah = await createSupplier(
      ctx.businessId,
      ctx.ownerUserId,
      baseSupplierInput({ supplierName: "Mahal Mentah Tapi Net Termurah" }),
    );
    await replaceSupplierDeliveryAreas(ctx.businessId, mahalMentah.id, [DESTINATION]);
    await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({
        supplierId: mahalMentah.id,
        productId: productId6,
        price: { pricePerPackage: 340000, taxStatus: "NONE" },
      }),
    );
    await upsertShippingRule(ctx.businessId, mahalMentah.id, ctx.ownerUserId, {
      ruleType: "GRATIS_TANPA_SYARAT",
    });
    // subtotal = 340.000; total = 340.000 + 0 = 340.000; per kg = 13.600

    const result = await buildComparison({
      businessId: ctx.businessId,
      productId: productId6,
      neededQuantity: 20,
      neededUnit: "KILOGRAM",
      destination: DESTINATION,
      neededByDate: NEEDED_BY_DATE,
      today: TODAY,
    });

    const rowMurahMentah = result.rows.find((r) => r.supplier.name === "Murah Mentah")!;
    const rowMahalMentah = result.rows.find(
      (r) => r.supplier.name === "Mahal Mentah Tapi Net Termurah",
    )!;

    expect(rowMurahMentah.price.pricePerPackage.toNumber()).toBeLessThan(
      rowMahalMentah.price.pricePerPackage.toNumber(),
    );
    expect(rowMurahMentah.money.totalCost!.toNumber()).toBe(410000);
    expect(rowMahalMentah.money.totalCost!.toNumber()).toBe(340000);

    // Meskipun harga mentahnya LEBIH TINGGI, "Mahal Mentah" net lebih murah
    // setelah pajak & ongkir, sehingga labelnya harus jatuh ke sini.
    expect(rowMahalMentah.labels).toContain(LABEL.CHEAPEST_UNIT_PRICE);
    expect(rowMahalMentah.labels).toContain(LABEL.CHEAPEST_TOTAL);
    expect(rowMurahMentah.labels).not.toContain(LABEL.CHEAPEST_UNIT_PRICE);
    expect(rowMurahMentah.labels).not.toContain(LABEL.CHEAPEST_TOTAL);
  });

  it("kasus #7: isolasi business_id — produk bisnis A tidak dapat dibandingkan lewat businessId bisnis B", async () => {
    await expect(
      buildComparison({
        businessId: otherCtx.businessId,
        productId,
        neededQuantity: 20,
        neededUnit: "KILOGRAM",
        destination: DESTINATION,
        neededByDate: NEEDED_BY_DATE,
        today: TODAY,
      }),
    ).rejects.toThrow(ProductNotFoundError);
  });
});

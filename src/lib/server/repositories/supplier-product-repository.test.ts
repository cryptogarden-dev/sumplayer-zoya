import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createTestBusiness,
  deleteTestBusiness,
  type TestBusinessContext,
} from "@/tests/db-helpers";
import { createSupplier } from "@/lib/server/repositories/supplier-repository";
import { createProduct } from "@/lib/server/repositories/product-repository";
import {
  addPriceHistoryEntry,
  createOffer,
  getOfferById,
  getPriceHistory,
  updateOfferDefinition,
  upsertStock,
} from "@/lib/server/repositories/supplier-product-repository";
import type { SupplierInput } from "@/lib/validation/supplier";
import type { ProductInput } from "@/lib/validation/product";
import type { SupplierProductInput } from "@/lib/validation/supplier-product";
import { calculatePriceChange } from "@/lib/domain";

function baseSupplierInput(overrides: Partial<SupplierInput> = {}): SupplierInput {
  return {
    supplierName: "CV Sumber Pangan",
    phoneNumber: "081234567890",
    address: "Jl. Pasar Induk No. 1",
    province: "DKI Jakarta",
    city: "Jakarta Timur",
    leadTimeDaysMin: 0,
    leadTimeDaysMax: 2,
    ...overrides,
  } as SupplierInput;
}

function baseProductInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    sku: "BERAS-PREMIUM",
    productName: "Beras Premium",
    unitFamily: "WEIGHT",
    ...overrides,
  } as ProductInput;
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
    stock: { availabilityStatus: "TERSEDIA" },
    ...overrides,
  } as SupplierProductInput;
}

describe("supplier-product-repository", () => {
  let ctx: TestBusinessContext;
  let otherCtx: TestBusinessContext;
  let supplierId: string;
  let productId: string;

  beforeAll(async () => {
    ctx = await createTestBusiness("Offer Repo A");
    otherCtx = await createTestBusiness("Offer Repo B");

    const supplier = await createSupplier(ctx.businessId, ctx.ownerUserId, baseSupplierInput());
    supplierId = supplier.id;
    const product = await createProduct(ctx.businessId, ctx.ownerUserId, baseProductInput());
    productId = product.id;
  });

  afterAll(async () => {
    // Sengaja TIDAK memanggil prisma.$disconnect() - lihat catatan di
    // product-repository.test.ts.
    await deleteTestBusiness(ctx.businessId);
    await deleteTestBusiness(otherCtx.businessId);
  });

  it("perhitungan preview (golden case R06): 1 karung beras 25kg -> total isi 25kg", async () => {
    const offer = await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({ supplierId, productId }),
    );
    expect(Number(offer?.totalPackageContent)).toBe(25);
    expect(offer?.baseUnit).toBe("KILOGRAM");
    expect(Number(offer?.prices[0]?.pricePerPackage)).toBe(375000);
  });

  it("golden case dus minyak: 12 botol x 1 liter -> total isi 12 liter", async () => {
    const minyak = await createProduct(ctx.businessId, ctx.ownerUserId, {
      sku: "MINYAK-GORENG",
      productName: "Minyak Goreng",
      unitFamily: "VOLUME",
    } as ProductInput);

    const offer = await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({
        supplierId,
        productId: minyak.id,
        packageType: "DUS",
        itemsPerPackage: 12,
        contentPerItem: 1,
        contentUnit: "LITER",
        price: { pricePerPackage: 204000, taxStatus: "NONE" },
      }),
    );
    expect(Number(offer?.totalPackageContent)).toBe(12);
    expect(offer?.baseUnit).toBe("LITER");
  });

  it("golden case barang pcs: 24 pcs -> total isi 24 pcs", async () => {
    const barang = await createProduct(ctx.businessId, ctx.ownerUserId, {
      sku: "BARANG-PCS",
      productName: "Barang Satuan",
      unitFamily: "COUNT",
    } as ProductInput);

    const offer = await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({
        supplierId,
        productId: barang.id,
        packageType: "BOX",
        itemsPerPackage: 24,
        contentPerItem: 1,
        contentUnit: "PCS",
        price: { pricePerPackage: 240000, taxStatus: "NONE" },
      }),
    );
    expect(Number(offer?.totalPackageContent)).toBe(24);
    expect(offer?.baseUnit).toBe("PCS");
  });

  it("validasi satuan: menolak kemasan dengan family berbeda dari produk (kg vs liter)", async () => {
    await expect(
      createOffer(
        ctx.businessId,
        ctx.ownerUserId,
        baseOfferInput({
          supplierId,
          productId, // produk Beras Premium ber-family WEIGHT
          packageType: "BOTOL",
          itemsPerPackage: 1,
          contentPerItem: 1,
          contentUnit: "LITER", // family VOLUME - tidak cocok
        }),
      ),
    ).rejects.toThrow(/tidak sesuai/i);
  });

  it("perubahan harga membuat riwayat baru (append-only), harga lama tidak hilang", async () => {
    const offer = await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({
        supplierId,
        productId,
        price: { pricePerPackage: 100000, taxStatus: "NONE" },
      }),
    );
    if (!offer) throw new Error("offer gagal dibuat");

    const historyAfterCreate = await getPriceHistory(ctx.businessId, offer.id);
    expect(historyAfterCreate).toHaveLength(1);

    const secondEntry = await addPriceHistoryEntry(ctx.businessId, ctx.ownerUserId, offer.id, {
      pricePerPackage: 120000,
      taxStatus: "NONE",
    });
    expect(secondEntry?.pricePerPackage.toString()).toBe("120000");

    const thirdEntry = await addPriceHistoryEntry(ctx.businessId, ctx.ownerUserId, offer.id, {
      pricePerPackage: 110000,
      taxStatus: "NONE",
    });
    expect(thirdEntry).not.toBeNull();

    const history = await getPriceHistory(ctx.businessId, offer.id);
    expect(history).toHaveLength(3);
    // Harga lama (100000) HARUS tetap ada, bukan diganti/dihapus.
    const prices = history.map((h) => Number(h.pricePerPackage)).sort((a, b) => a - b);
    expect(prices).toEqual([100000, 110000, 120000]);

    // Riwayat terurut terbaru dahulu.
    expect(Number(history[0]?.pricePerPackage)).toBe(110000);

    const change = calculatePriceChange({
      oldPrice: history[1]?.pricePerPackage.toString() ?? "0",
      newPrice: history[0]?.pricePerPackage.toString() ?? "0",
    });
    expect(change.amountChange.toNumber()).toBe(-10000);
    expect(change.direction).toBe("TURUN");
  });

  it("mengelola stok terkini (mutable, bukan riwayat)", async () => {
    const offer = await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({ supplierId, productId }),
    );
    if (!offer) throw new Error("offer gagal dibuat");

    const stock = await upsertStock(ctx.businessId, ctx.ownerUserId, offer.id, {
      availabilityStatus: "STOK_TERBATAS",
      stockQty: 5,
    });
    expect(stock?.availabilityStatus).toBe("STOK_TERBATAS");
    expect(Number(stock?.stockQty)).toBe(5);

    const updatedStock = await upsertStock(ctx.businessId, ctx.ownerUserId, offer.id, {
      availabilityStatus: "TERSEDIA",
      stockQty: undefined,
    });
    expect(updatedStock?.availabilityStatus).toBe("TERSEDIA");

    // Stok bersifat mutable - hanya SATU baris per penawaran, bukan riwayat.
    const stockRows = await prisma.supplierStock.findMany({
      where: { supplierProductId: offer.id },
    });
    expect(stockRows).toHaveLength(1);
  });

  it("memperbarui definisi kemasan tanpa mengubah riwayat harga", async () => {
    const offer = await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({ supplierId, productId }),
    );
    if (!offer) throw new Error("offer gagal dibuat");

    const updated = await updateOfferDefinition(ctx.businessId, offer.id, {
      packageType: "KARUNG",
      itemsPerPackage: 1,
      contentPerItem: 50,
      contentUnit: "KILOGRAM",
      minPurchasePackages: 1,
      purchaseMultiplePackages: 1,
    });
    expect(Number(updated?.totalPackageContent)).toBe(50);

    const history = await getPriceHistory(ctx.businessId, offer.id);
    expect(history).toHaveLength(1);
  });

  it("isolasi data antar-bisnis: penawaran bisnis A tidak terlihat/tidak dapat diubah dari bisnis B", async () => {
    const offer = await createOffer(
      ctx.businessId,
      ctx.ownerUserId,
      baseOfferInput({ supplierId, productId }),
    );
    if (!offer) throw new Error("offer gagal dibuat");

    const fromOtherBusiness = await getOfferById(otherCtx.businessId, offer.id);
    expect(fromOtherBusiness).toBeNull();

    const priceFromOtherBusiness = await addPriceHistoryEntry(
      otherCtx.businessId,
      otherCtx.ownerUserId,
      offer.id,
      { pricePerPackage: 999999, taxStatus: "NONE" },
    );
    expect(priceFromOtherBusiness).toBeNull();

    const stockFromOtherBusiness = await upsertStock(
      otherCtx.businessId,
      otherCtx.ownerUserId,
      offer.id,
      {
        availabilityStatus: "KOSONG",
      },
    );
    expect(stockFromOtherBusiness).toBeNull();
  });

  it("menolak referensi supplier/produk milik bisnis lain saat membuat penawaran", async () => {
    const foreignSupplier = await createSupplier(
      otherCtx.businessId,
      otherCtx.ownerUserId,
      baseSupplierInput(),
    );

    await expect(
      createOffer(
        ctx.businessId,
        ctx.ownerUserId,
        baseOfferInput({ supplierId: foreignSupplier.id, productId }),
      ),
    ).rejects.toThrow(/supplier tidak ditemukan/i);
  });
});

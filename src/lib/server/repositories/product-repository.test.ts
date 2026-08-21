import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestBusiness,
  deleteTestBusiness,
  type TestBusinessContext,
} from "@/tests/db-helpers";
import {
  createProduct,
  getProductById,
  isSkuTaken,
  listProducts,
  setProductActive,
  updateProduct,
} from "@/lib/server/repositories/product-repository";
import type { ProductInput } from "@/lib/validation/product";

function baseProductInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    sku: "BERAS-PREMIUM",
    barcode: undefined,
    productName: "Beras Premium",
    brand: undefined,
    variant: undefined,
    categoryId: undefined,
    photoUrl: undefined,
    unitFamily: "WEIGHT",
    notes: undefined,
    ...overrides,
  };
}

describe("product-repository", () => {
  let ctx: TestBusinessContext;
  let otherCtx: TestBusinessContext;

  beforeAll(async () => {
    ctx = await createTestBusiness("Produk Repo A");
    otherCtx = await createTestBusiness("Produk Repo B");
  });

  afterAll(async () => {
    // Sengaja TIDAK memanggil prisma.$disconnect() - client Prisma adalah
    // singleton berbasis globalThis (lihat src/lib/db/prisma.ts) yang
    // dipakai bersama lintas file test dalam proses worker yang sama;
    // memutusnya di sini akan merusak koneksi untuk file test lain.
    await deleteTestBusiness(ctx.businessId);
    await deleteTestBusiness(otherCtx.businessId);
  });

  it("CRUD: membuat, membaca, mengubah, dan menonaktifkan produk", async () => {
    const created = await createProduct(ctx.businessId, ctx.ownerUserId, baseProductInput());
    expect(created.sku).toBe("BERAS-PREMIUM");
    expect(created.baseUnit).toBe("KILOGRAM");
    expect(created.isActive).toBe(true);

    const fetched = await getProductById(ctx.businessId, created.id);
    expect(fetched?.productName).toBe("Beras Premium");

    const updated = await updateProduct(
      ctx.businessId,
      created.id,
      baseProductInput({ productName: "Beras Premium 5kg" }),
    );
    expect(updated?.productName).toBe("Beras Premium 5kg");

    const deactivated = await setProductActive(ctx.businessId, created.id, false);
    expect(deactivated).toBe(true);

    const afterDeactivate = await getProductById(ctx.businessId, created.id);
    expect(afterDeactivate?.isActive).toBe(false);
  });

  it("validasi satuan: base_unit diturunkan otomatis dari unit_family, bukan dari input bebas", async () => {
    const weight = await createProduct(
      ctx.businessId,
      ctx.ownerUserId,
      baseProductInput({ sku: "BERAS-PREMIUM-2", unitFamily: "WEIGHT" }),
    );
    expect(weight.baseUnit).toBe("KILOGRAM");

    const volume = await createProduct(
      ctx.businessId,
      ctx.ownerUserId,
      baseProductInput({
        sku: "MINYAK-GORENG",
        productName: "Minyak Goreng",
        unitFamily: "VOLUME",
      }),
    );
    expect(volume.baseUnit).toBe("LITER");

    const count = await createProduct(
      ctx.businessId,
      ctx.ownerUserId,
      baseProductInput({ sku: "BARANG-PCS", productName: "Barang Satuan", unitFamily: "COUNT" }),
    );
    expect(count.baseUnit).toBe("PCS");
  });

  it("SKU unik per bisnis: menolak SKU duplikat pada bisnis yang sama", async () => {
    await createProduct(ctx.businessId, ctx.ownerUserId, baseProductInput({ sku: "SKU-UNIK-1" }));
    const taken = await isSkuTaken(ctx.businessId, "SKU-UNIK-1");
    expect(taken).toBe(true);

    // Tapi SKU yang sama BOLEH dipakai di bisnis lain (bukan unik global).
    const takenInOtherBusiness = await isSkuTaken(otherCtx.businessId, "SKU-UNIK-1");
    expect(takenInOtherBusiness).toBe(false);
  });

  it("isolasi data antar-bisnis: produk bisnis A tidak terlihat dari bisnis B", async () => {
    const created = await createProduct(
      ctx.businessId,
      ctx.ownerUserId,
      baseProductInput({ sku: "ISOLASI-1" }),
    );

    const fromOtherBusiness = await getProductById(otherCtx.businessId, created.id);
    expect(fromOtherBusiness).toBeNull();

    const list = await listProducts(otherCtx.businessId, { includeInactive: true });
    expect(list.some((p) => p.id === created.id)).toBe(false);

    const updateResult = await updateProduct(
      otherCtx.businessId,
      created.id,
      baseProductInput({ sku: "ISOLASI-1", productName: "Dicoba diubah bisnis lain" }),
    );
    expect(updateResult).toBeNull();
  });
});

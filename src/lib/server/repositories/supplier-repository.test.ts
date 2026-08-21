import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createTestBusiness,
  deleteTestBusiness,
  type TestBusinessContext,
} from "@/tests/db-helpers";
import {
  addSupplierContact,
  createSupplier,
  getSupplierById,
  listSuppliers,
  replaceSupplierDeliveryAreas,
  replaceSupplierDeliverySchedules,
  setSupplierActive,
  updateSupplier,
  upsertShippingRule,
} from "@/lib/server/repositories/supplier-repository";
import type { SupplierInput } from "@/lib/validation/supplier";

function baseSupplierInput(overrides: Partial<SupplierInput> = {}): SupplierInput {
  return {
    supplierName: "CV Sumber Pangan",
    companyName: undefined,
    contactName: "Budi",
    phoneNumber: "081234567890",
    whatsappNumber: undefined,
    email: undefined,
    address: "Jl. Pasar Induk No. 1",
    province: "DKI Jakarta",
    city: "Jakarta Timur",
    district: undefined,
    postalCode: undefined,
    latitude: undefined,
    longitude: undefined,
    mapLocation: undefined,
    operatingHours: undefined,
    leadTimeDaysMin: 0,
    leadTimeDaysMax: 2,
    orderCutoffTime: undefined,
    orderCutoffDays: undefined,
    minPurchaseAmount: undefined,
    paymentMethod: undefined,
    paymentTermDays: undefined,
    notes: undefined,
    ...overrides,
  };
}

describe("supplier-repository", () => {
  let ctx: TestBusinessContext;
  let otherCtx: TestBusinessContext;

  beforeAll(async () => {
    ctx = await createTestBusiness("Supplier Repo A");
    otherCtx = await createTestBusiness("Supplier Repo B");
  });

  afterAll(async () => {
    // Sengaja TIDAK memanggil prisma.$disconnect() - lihat catatan di
    // product-repository.test.ts.
    await deleteTestBusiness(ctx.businessId);
    await deleteTestBusiness(otherCtx.businessId);
  });

  it("CRUD: membuat, membaca, mengubah, dan menonaktifkan supplier", async () => {
    const created = await createSupplier(ctx.businessId, ctx.ownerUserId, baseSupplierInput());
    expect(created.supplierName).toBe("CV Sumber Pangan");
    expect(created.isActive).toBe(true);

    const fetched = await getSupplierById(ctx.businessId, created.id);
    expect(fetched?.id).toBe(created.id);

    const updated = await updateSupplier(
      ctx.businessId,
      created.id,
      baseSupplierInput({ supplierName: "CV Sumber Pangan Jaya" }),
    );
    expect(updated?.supplierName).toBe("CV Sumber Pangan Jaya");

    const deactivated = await setSupplierActive(ctx.businessId, created.id, false);
    expect(deactivated).toBe(true);

    const afterDeactivate = await getSupplierById(ctx.businessId, created.id);
    expect(afterDeactivate?.isActive).toBe(false);

    const list = await listSuppliers(ctx.businessId, { includeInactive: true });
    expect(list.some((s) => s.id === created.id)).toBe(true);

    const activeOnlyList = await listSuppliers(ctx.businessId, { includeInactive: false });
    expect(activeOnlyList.some((s) => s.id === created.id)).toBe(false);
  });

  it("menolak field wajib minimal: harus punya salah satu kontak (divalidasi di layer Zod, bukan di sini) namun tetap menyimpan bila lolos", async () => {
    const created = await createSupplier(
      ctx.businessId,
      ctx.ownerUserId,
      baseSupplierInput({ phoneNumber: undefined, whatsappNumber: "081298765432" }),
    );
    expect(created.whatsappNumber).toBe("081298765432");
    expect(created.phoneNumber).toBeNull();
  });

  it("isolasi data antar-bisnis: supplier bisnis A tidak terlihat dari bisnis B", async () => {
    const created = await createSupplier(ctx.businessId, ctx.ownerUserId, baseSupplierInput());

    const fromOtherBusiness = await getSupplierById(otherCtx.businessId, created.id);
    expect(fromOtherBusiness).toBeNull();

    const listFromOtherBusiness = await listSuppliers(otherCtx.businessId, {
      includeInactive: true,
    });
    expect(listFromOtherBusiness.some((s) => s.id === created.id)).toBe(false);

    // Update/nonaktifkan dari bisnis lain juga harus gagal (no-op, bukan mengubah data bisnis A).
    const updateResult = await updateSupplier(
      otherCtx.businessId,
      created.id,
      baseSupplierInput({ supplierName: "Dicoba Diubah Bisnis Lain" }),
    );
    expect(updateResult).toBeNull();

    const stillOriginal = await getSupplierById(ctx.businessId, created.id);
    expect(stillOriginal?.supplierName).toBe("CV Sumber Pangan");
  });

  it("mengelola kontak tambahan supplier", async () => {
    const created = await createSupplier(ctx.businessId, ctx.ownerUserId, baseSupplierInput());
    const contact = await addSupplierContact(ctx.businessId, created.id, {
      contactName: "Sari (Gudang)",
      roleTitle: "Admin Gudang",
      phoneNumber: "081211112222",
      whatsappNumber: undefined,
      email: undefined,
      isPrimary: false,
    });
    expect(contact?.contactName).toBe("Sari (Gudang)");

    const contactFromOtherBusiness = await addSupplierContact(otherCtx.businessId, created.id, {
      contactName: "Percobaan",
      isPrimary: false,
    });
    expect(contactFromOtherBusiness).toBeNull();
  });

  it("mengganti seluruh area & jadwal pengiriman (set operation)", async () => {
    const created = await createSupplier(ctx.businessId, ctx.ownerUserId, baseSupplierInput());

    const areas = await replaceSupplierDeliveryAreas(ctx.businessId, created.id, [
      { province: "DKI Jakarta", city: "Jakarta Timur" },
      { province: "Jawa Barat", city: "Bekasi" },
    ]);
    expect(areas).toHaveLength(2);

    const replacedAreas = await replaceSupplierDeliveryAreas(ctx.businessId, created.id, [
      { province: "Banten" },
    ]);
    expect(replacedAreas).toHaveLength(1);
    expect(replacedAreas?.[0]?.province).toBe("Banten");

    const schedules = await replaceSupplierDeliverySchedules(ctx.businessId, created.id, [
      { dayOfWeek: 1 },
      { dayOfWeek: 3 },
      { dayOfWeek: 5 },
    ]);
    expect(schedules).toHaveLength(3);
    expect(schedules?.map((s) => s.dayOfWeek)).toEqual([1, 3, 5]);
  });

  it("aturan ongkir: membuat dan memperbarui aturan gratis ongkir bersyarat", async () => {
    const created = await createSupplier(ctx.businessId, ctx.ownerUserId, baseSupplierInput());

    const rule = await upsertShippingRule(ctx.businessId, created.id, ctx.ownerUserId, {
      ruleType: "GRATIS_MIN_PEMBELIAN",
      freeShippingMinAmount: 500000,
      flatFee: 10000,
      notes: undefined,
      areas: undefined,
    });
    expect(rule?.ruleType).toBe("GRATIS_MIN_PEMBELIAN");
    expect(Number(rule?.freeShippingMinAmount)).toBe(500000);
    expect(Number(rule?.flatFee)).toBe(10000);

    // Upsert kedua kali harus MENGGANTI (bukan menduplikasi) aturan yang sama.
    const updatedRule = await upsertShippingRule(ctx.businessId, created.id, ctx.ownerUserId, {
      ruleType: "TETAP",
      flatFee: 20000,
      freeShippingMinAmount: undefined,
      notes: undefined,
      areas: undefined,
    });
    expect(updatedRule?.ruleType).toBe("TETAP");
    expect(Number(updatedRule?.flatFee)).toBe(20000);

    const allRules = await prisma.shippingRule.findMany({ where: { supplierId: created.id } });
    expect(allRules).toHaveLength(1);
  });

  it("aturan ongkir berdasarkan area menyimpan daftar tarif per area", async () => {
    const created = await createSupplier(ctx.businessId, ctx.ownerUserId, baseSupplierInput());

    const rule = await upsertShippingRule(ctx.businessId, created.id, ctx.ownerUserId, {
      ruleType: "BERDASARKAN_AREA",
      notes: undefined,
      freeShippingMinAmount: undefined,
      flatFee: undefined,
      areas: [
        { province: "DKI Jakarta", city: undefined, fee: 15000 },
        { province: "Jawa Barat", city: "Bekasi", fee: 25000 },
      ],
    });

    expect(rule?.areas).toHaveLength(2);
  });
});

import "server-only";
import { prisma } from "@/lib/db/prisma";
import { DeletionBlockedError } from "@/lib/domain";
import type { SupplierContactInput, SupplierInput } from "@/lib/validation/supplier";
import type { ShippingRuleInput } from "@/lib/validation/shipping-rule";
import type { Prisma } from "@generated/prisma/client";

/**
 * Repository supplier (R01). SETIAP fungsi WAJIB menerima `businessId` dari
 * sesi terautentikasi (bukan dari input klien) dan menyertakannya di setiap
 * klausa `where` - baris pertahanan utama isolasi multi-tenant (R26,
 * ARCHITECTURE.md §4).
 */

export interface SupplierListFilters {
  q?: string;
  city?: string;
  area?: string;
  includeInactive?: boolean;
}

const SUPPLIER_DETAIL_INCLUDE = {
  contacts: { orderBy: { isPrimary: "desc" as const } },
  deliveryAreas: true,
  deliverySchedules: { orderBy: { dayOfWeek: "asc" as const } },
  shippingRule: { include: { areas: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { supplierProducts: true } },
} satisfies Prisma.SupplierInclude;

export type SupplierWithDetails = Prisma.SupplierGetPayload<{
  include: typeof SUPPLIER_DETAIL_INCLUDE;
}>;

function dayNumbersToText(days: number[] | undefined): string[] {
  return (days ?? []).map((day) => String(day));
}

function textToDayNumbers(days: string[]): number[] {
  return days.map((day) => Number.parseInt(day, 10)).filter((day) => Number.isFinite(day));
}

function supplierWriteData(businessId: string, input: SupplierInput) {
  return {
    businessId,
    supplierName: input.supplierName,
    companyName: input.companyName ?? null,
    contactName: input.contactName ?? null,
    phoneNumber: input.phoneNumber ?? null,
    whatsappNumber: input.whatsappNumber ?? null,
    email: input.email ?? null,
    address: input.address,
    province: input.province,
    city: input.city,
    district: input.district ?? null,
    postalCode: input.postalCode ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    mapLocation: input.mapLocation ?? null,
    operatingHours: input.operatingHours ?? null,
    leadTimeDaysMin: input.leadTimeDaysMin,
    leadTimeDaysMax: input.leadTimeDaysMax,
    orderCutoffTime: input.orderCutoffTime ?? null,
    orderCutoffDays: dayNumbersToText(input.orderCutoffDays),
    minPurchaseAmount: input.minPurchaseAmount ?? null,
    paymentMethod: input.paymentMethod ?? null,
    paymentTermDays: input.paymentTermDays ?? null,
    notes: input.notes ?? null,
  };
}

export async function listSuppliers(businessId: string, filters: SupplierListFilters = {}) {
  const where: Prisma.SupplierWhereInput = {
    businessId,
    isActive: filters.includeInactive ? undefined : true,
  };

  if (filters.q) {
    where.OR = [
      { supplierName: { contains: filters.q, mode: "insensitive" } },
      { companyName: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.city) {
    where.city = { equals: filters.city, mode: "insensitive" };
  }

  if (filters.area) {
    where.deliveryAreas = {
      some: {
        OR: [
          { province: { contains: filters.area, mode: "insensitive" } },
          { city: { contains: filters.area, mode: "insensitive" } },
          { district: { contains: filters.area, mode: "insensitive" } },
        ],
      },
    };
  }

  return prisma.supplier.findMany({
    where,
    orderBy: { supplierName: "asc" },
    include: { _count: { select: { supplierProducts: true } }, deliveryAreas: true },
  });
}

export async function getSupplierById(
  businessId: string,
  id: string,
): Promise<SupplierWithDetails | null> {
  return prisma.supplier.findFirst({
    where: { id, businessId },
    include: SUPPLIER_DETAIL_INCLUDE,
  });
}

export async function createSupplier(businessId: string, userId: string, input: SupplierInput) {
  return prisma.supplier.create({
    data: {
      ...supplierWriteData(businessId, input),
      createdById: userId,
    },
  });
}

export async function updateSupplier(businessId: string, id: string, input: SupplierInput) {
  const result = await prisma.supplier.updateMany({
    where: { id, businessId },
    data: supplierWriteData(businessId, input),
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.supplier.findFirst({ where: { id, businessId } });
}

export async function setSupplierActive(businessId: string, id: string, isActive: boolean) {
  const result = await prisma.supplier.updateMany({
    where: { id, businessId },
    data: { isActive },
  });
  return result.count > 0;
}

/**
 * Hapus PERMANEN satu supplier (docs/BACKLOG.md #5, pola sama seperti
 * `deleteProduct`). Skema memakai `onDelete: Cascade` dari Supplier ->
 * SupplierProduct -> PurchaseOrderItem DAN Supplier -> PurchaseOrder
 * langsung, jadi hapus permanen supplier bisa merusak riwayat pesanan lama
 * kalau tidak dijaga - ditolak dengan `DeletionBlockedError` jika supplier
 * ini pernah dipakai di baris pesanan manapun. Gunakan `setSupplierActive`
 * (nonaktifkan) untuk kasus itu.
 */
export async function deleteSupplier(businessId: string, id: string): Promise<boolean> {
  const supplier = await prisma.supplier.findFirst({ where: { id, businessId } });
  if (!supplier) return false;

  const orderHistoryCount = await prisma.purchaseOrderItem.count({
    where: { businessId, supplierProduct: { supplierId: id } },
  });
  if (orderHistoryCount > 0) {
    throw new DeletionBlockedError(
      "Supplier ini sudah pernah dipesan, jadi tidak bisa dihapus permanen (supaya riwayat pesanan lama tidak rusak). Gunakan tombol Nonaktifkan.",
    );
  }

  await prisma.supplier.delete({ where: { id } });
  return true;
}

export async function listSupplierContacts(businessId: string, supplierId: string) {
  return prisma.supplierContact.findMany({
    where: { businessId, supplierId },
    orderBy: [{ isPrimary: "desc" }, { contactName: "asc" }],
  });
}

export async function addSupplierContact(
  businessId: string,
  supplierId: string,
  input: SupplierContactInput,
) {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, businessId } });
  if (!supplier) {
    return null;
  }

  return prisma.supplierContact.create({
    data: {
      businessId,
      supplierId,
      contactName: input.contactName,
      roleTitle: input.roleTitle ?? null,
      phoneNumber: input.phoneNumber ?? null,
      whatsappNumber: input.whatsappNumber ?? null,
      email: input.email ?? null,
      isPrimary: input.isPrimary ?? false,
    },
  });
}

export interface DeliveryAreaInput {
  province: string;
  city?: string;
  district?: string;
  notes?: string;
}

/** Mengganti seluruh daftar area pengiriman supplier (set operation sederhana). */
export async function replaceSupplierDeliveryAreas(
  businessId: string,
  supplierId: string,
  areas: DeliveryAreaInput[],
) {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, businessId } });
  if (!supplier) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    await tx.supplierDeliveryArea.deleteMany({ where: { supplierId, businessId } });
    if (areas.length > 0) {
      await tx.supplierDeliveryArea.createMany({
        data: areas.map((area) => ({
          businessId,
          supplierId,
          province: area.province,
          city: area.city ?? null,
          district: area.district ?? null,
          notes: area.notes ?? null,
        })),
      });
    }
    return tx.supplierDeliveryArea.findMany({ where: { supplierId, businessId } });
  });
}

export interface DeliveryScheduleInput {
  dayOfWeek: number;
  notes?: string;
}

/** Mengganti seluruh jadwal pengiriman rutin supplier (set operation sederhana). */
export async function replaceSupplierDeliverySchedules(
  businessId: string,
  supplierId: string,
  days: DeliveryScheduleInput[],
) {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, businessId } });
  if (!supplier) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    await tx.supplierDeliverySchedule.deleteMany({ where: { supplierId, businessId } });
    if (days.length > 0) {
      await tx.supplierDeliverySchedule.createMany({
        data: days.map((day) => ({
          businessId,
          supplierId,
          dayOfWeek: day.dayOfWeek,
          notes: day.notes ?? null,
        })),
      });
    }
    return tx.supplierDeliverySchedule.findMany({
      where: { supplierId, businessId },
      orderBy: { dayOfWeek: "asc" },
    });
  });
}

export async function getShippingRule(businessId: string, supplierId: string) {
  return prisma.shippingRule.findFirst({
    where: { businessId, supplierId },
    include: { areas: true },
  });
}

/** Membuat atau memperbarui aturan ongkir supplier (relasi 1:1 - lihat schema.prisma). */
export async function upsertShippingRule(
  businessId: string,
  supplierId: string,
  userId: string,
  input: ShippingRuleInput,
) {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, businessId } });
  if (!supplier) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.shippingRule.findFirst({ where: { businessId, supplierId } });

    const baseData = {
      ruleType: input.ruleType,
      freeShippingMinAmount: input.freeShippingMinAmount ?? null,
      flatFee: input.flatFee ?? null,
      notes: input.notes ?? null,
    };

    const rule = existing
      ? await tx.shippingRule.update({ where: { id: existing.id }, data: baseData })
      : await tx.shippingRule.create({
          data: { ...baseData, businessId, supplierId, createdById: userId },
        });

    await tx.shippingRuleArea.deleteMany({ where: { shippingRuleId: rule.id } });
    if (input.areas && input.areas.length > 0) {
      await tx.shippingRuleArea.createMany({
        data: input.areas.map((area) => ({
          businessId,
          shippingRuleId: rule.id,
          province: area.province,
          city: area.city ?? null,
          fee: area.fee,
        })),
      });
    }

    return tx.shippingRule.findFirst({ where: { id: rule.id }, include: { areas: true } });
  });
}

export { textToDayNumbers };

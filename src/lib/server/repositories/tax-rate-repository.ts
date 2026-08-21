import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { TaxRateInput } from "@/lib/validation/tax-rate";

/** Tarif pajak per bisnis (R07). Hanya Pemilik/Admin yang boleh mengelola (dicek di route handler). */
export async function listTaxRates(businessId: string, includeInactive = false) {
  return prisma.taxRate.findMany({
    where: { businessId, isActive: includeInactive ? undefined : true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getTaxRateById(businessId: string, id: string) {
  return prisma.taxRate.findFirst({ where: { id, businessId } });
}

export async function createTaxRate(businessId: string, userId: string, input: TaxRateInput) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.taxRate.updateMany({
        where: { businessId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.taxRate.create({
      data: {
        businessId,
        name: input.name,
        ratePercent: input.ratePercent,
        isDefault: input.isDefault ?? false,
        createdById: userId,
      },
    });
  });
}

export async function updateTaxRate(
  businessId: string,
  id: string,
  input: TaxRateInput & { isActive?: boolean },
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.taxRate.findFirst({ where: { id, businessId } });
    if (!existing) return null;

    if (input.isDefault) {
      await tx.taxRate.updateMany({
        where: { businessId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return tx.taxRate.update({
      where: { id },
      data: {
        name: input.name,
        ratePercent: input.ratePercent,
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? existing.isActive,
      },
    });
  });
}

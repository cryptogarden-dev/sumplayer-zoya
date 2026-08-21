import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { BusinessLocationInput } from "@/lib/validation/business-location";

/**
 * Lokasi/cabang bisnis (pengembangan lanjutan disepakati 2026-08-18 -
 * lihat docs/BACKLOG.md #1). Dipakai untuk mengisi otomatis alamat
 * tujuan pada halaman Bandingkan & Pesanan, tanpa perlu ketik manual
 * berulang.
 */
export async function listBusinessLocations(businessId: string, includeInactive = false) {
  return prisma.businessLocation.findMany({
    where: { businessId, isActive: includeInactive ? undefined : true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getDefaultBusinessLocation(businessId: string) {
  return prisma.businessLocation.findFirst({
    where: { businessId, isActive: true, isDefault: true },
  });
}

export async function getBusinessLocationById(businessId: string, id: string) {
  return prisma.businessLocation.findFirst({ where: { id, businessId } });
}

/**
 * Lokasi PERTAMA yang dibuat untuk sebuah bisnis otomatis dijadikan
 * default (tidak ada default sebelumnya untuk ditimpa). Untuk lokasi
 * berikutnya, `isDefault: true` memindahkan status default dari lokasi
 * lain (hanya satu default aktif per bisnis pada satu waktu).
 */
export async function createBusinessLocation(businessId: string, input: BusinessLocationInput) {
  return prisma.$transaction(async (tx) => {
    const existingCount = await tx.businessLocation.count({ where: { businessId } });
    const shouldBeDefault = existingCount === 0 || input.isDefault;

    if (shouldBeDefault) {
      await tx.businessLocation.updateMany({
        where: { businessId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.businessLocation.create({
      data: {
        businessId,
        name: input.name,
        province: input.province,
        city: input.city ?? null,
        district: input.district ?? null,
        address: input.address ?? null,
        isDefault: shouldBeDefault,
      },
    });
  });
}

export async function setBusinessLocationActive(businessId: string, id: string, isActive: boolean) {
  const result = await prisma.businessLocation.updateMany({
    where: { id, businessId },
    data: { isActive },
  });
  return result.count > 0;
}

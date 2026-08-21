import "server-only";
import { prisma } from "@/lib/db/prisma";

/** Ambang "data lama" (Tahap 3, poin 7) - dapat dikonfigurasi per bisnis. */
export async function getStaleDataThresholdDays(businessId: string): Promise<number> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { staleDataThresholdDays: true },
  });
  return business?.staleDataThresholdDays ?? 7;
}

export async function updateStaleDataThresholdDays(businessId: string, days: number) {
  return prisma.business.update({
    where: { id: businessId },
    data: { staleDataThresholdDays: days },
  });
}

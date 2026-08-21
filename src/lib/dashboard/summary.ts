import "server-only";
import { prisma } from "@/lib/db/prisma";

export interface DashboardSummary {
  supplierCount: number;
  productCount: number;
  activeOrderCount: number;
}

const INACTIVE_ORDER_STATUSES = ["DITERIMA", "DIBATALKAN"] as const;

/**
 * Ringkasan Beranda (poin 18 permintaan Tahap 1). Kartu "Pengingat" yang
 * dulu ada di sini sengaja DIHAPUS (disepakati pengguna 2026-08-21) - belum
 * ada kebutuhan nyata untuk itu, daripada dipaksakan jadi metrik yang tidak
 * berguna.
 */
export async function getDashboardSummary(businessId: string): Promise<DashboardSummary> {
  const [supplierCount, productCount, activeOrderCount] = await Promise.all([
    prisma.supplier.count({ where: { businessId, isActive: true } }),
    prisma.product.count({ where: { businessId, isActive: true } }),
    prisma.purchaseOrder.count({
      where: { businessId, status: { notIn: [...INACTIVE_ORDER_STATUSES] } },
    }),
  ]);

  return { supplierCount, productCount, activeOrderCount };
}

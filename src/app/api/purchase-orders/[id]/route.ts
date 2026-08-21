import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import {
  deletePurchaseOrder,
  getPurchaseOrderById,
} from "@/lib/server/repositories/purchase-order-repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const order = await getPurchaseOrderById(session.user.businessId, id);
    if (!order) {
      throw new ApiError(404, "Pesanan tidak ditemukan.");
    }
    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Hapus permanen (docs/BACKLOG.md #5, disepakati 2026-08-21). Hanya boleh
 * untuk status DRAFT/DIBATALKAN - `deletePurchaseOrder` melempar
 * `OrderStateError` (dipetakan `handleApiError` -> 400) untuk status lain.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const deleted = await deletePurchaseOrder(session.user.businessId, id);
    if (!deleted) {
      throw new ApiError(404, "Pesanan tidak ditemukan.");
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

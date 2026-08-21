import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { markPurchaseOrderAsSent } from "@/lib/server/repositories/purchase-order-repository";

/** Menandai draft sebagai terkirim ke supplier (R16/R17) - nomor pesanan dibuat di sini. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const order = await markPurchaseOrderAsSent(session.user.businessId, id);
    if (!order) {
      throw new ApiError(404, "Pesanan tidak ditemukan.");
    }
    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}

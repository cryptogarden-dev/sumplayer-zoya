import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { cancelPurchaseOrderSchema } from "@/lib/validation/purchase-order";
import { cancelPurchaseOrder } from "@/lib/server/repositories/purchase-order-repository";

/** Pembatalan wajib mengisi alasan (R29). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = cancelPurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Alasan pembatalan tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const order = await cancelPurchaseOrder(session.user.businessId, id, parsed.data.cancelReason);
    if (!order) {
      throw new ApiError(404, "Pesanan tidak ditemukan.");
    }
    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}

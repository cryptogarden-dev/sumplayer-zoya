import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { updatePurchaseOrderItemQtySchema } from "@/lib/validation/purchase-order";
import {
  removePurchaseOrderItem,
  updatePurchaseOrderItemQty,
} from "@/lib/server/repositories/purchase-order-repository";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id, itemId } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = updatePurchaseOrderItemQtySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Jumlah tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const item = await updatePurchaseOrderItemQty(
      session.user.businessId,
      id,
      itemId,
      parsed.data.packageQty,
    );
    if (!item) {
      throw new ApiError(404, "Baris produk tidak ditemukan.");
    }
    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id, itemId } = await params;
    const removed = await removePurchaseOrderItem(session.user.businessId, id, itemId);
    if (!removed) {
      throw new ApiError(404, "Baris produk tidak ditemukan.");
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

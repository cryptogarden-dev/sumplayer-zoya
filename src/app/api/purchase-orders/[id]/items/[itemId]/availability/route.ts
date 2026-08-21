import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { purchaseOrderItemAvailabilitySchema } from "@/lib/validation/purchase-order";
import { updatePurchaseOrderItemAvailability } from "@/lib/server/repositories/purchase-order-repository";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id, itemId } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = purchaseOrderItemAvailabilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Status ketersediaan tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const item = await updatePurchaseOrderItemAvailability(
      session.user.businessId,
      id,
      itemId,
      parsed.data,
    );
    if (!item) {
      throw new ApiError(404, "Baris produk tidak ditemukan.");
    }
    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { purchaseOrderItemInputSchema } from "@/lib/validation/purchase-order";
import { addPurchaseOrderItem } from "@/lib/server/repositories/purchase-order-repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = purchaseOrderItemInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data produk tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const item = await addPurchaseOrderItem(
      session.user.businessId,
      id,
      session.user.id,
      parsed.data,
    );
    if (!item) {
      throw new ApiError(404, "Pesanan tidak ditemukan.");
    }
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

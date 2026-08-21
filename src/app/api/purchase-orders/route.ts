import { NextResponse } from "next/server";
import { handleApiError, requireApiRole } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { createPurchaseOrderSchema } from "@/lib/validation/purchase-order";
import {
  createDraftPurchaseOrder,
  listPurchaseOrders,
} from "@/lib/server/repositories/purchase-order-repository";

export async function GET(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const url = new URL(request.url);
    const orders = await listPurchaseOrders(session.user.businessId, {
      status: url.searchParams.get("status") ?? undefined,
      supplierId: url.searchParams.get("supplierId") ?? undefined,
    });
    return NextResponse.json({ orders });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const body: unknown = await request.json().catch(() => null);
    const parsed = createPurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data pesanan tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const order = await createDraftPurchaseOrder(
      session.user.businessId,
      session.user.id,
      parsed.data,
    );
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

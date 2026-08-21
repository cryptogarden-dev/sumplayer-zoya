import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { stockInputSchema } from "@/lib/validation/supplier-product";
import { upsertStock } from "@/lib/server/repositories/supplier-product-repository";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = stockInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data stok tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const stock = await upsertStock(session.user.businessId, session.user.id, id, parsed.data);
    if (!stock) {
      throw new ApiError(404, "Penawaran tidak ditemukan.");
    }
    return NextResponse.json({ stock });
  } catch (error) {
    return handleApiError(error);
  }
}

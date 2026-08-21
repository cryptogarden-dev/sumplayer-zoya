import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { supplierInputSchema } from "@/lib/validation/supplier";
import { getSupplierById, updateSupplier } from "@/lib/server/repositories/supplier-repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const supplier = await getSupplierById(session.user.businessId, id);
    if (!supplier) {
      throw new ApiError(404, "Supplier tidak ditemukan.");
    }
    return NextResponse.json({ supplier });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = supplierInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data supplier tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const supplier = await updateSupplier(session.user.businessId, id, parsed.data);
    if (!supplier) {
      throw new ApiError(404, "Supplier tidak ditemukan.");
    }
    return NextResponse.json({ supplier });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { supplierDeliveryAreasReplaceSchema } from "@/lib/validation/supplier";
import { replaceSupplierDeliveryAreas } from "@/lib/server/repositories/supplier-repository";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = supplierDeliveryAreasReplaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data area pengiriman tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const areas = await replaceSupplierDeliveryAreas(
      session.user.businessId,
      id,
      parsed.data.areas,
    );
    if (!areas) {
      throw new ApiError(404, "Supplier tidak ditemukan.");
    }
    return NextResponse.json({ areas });
  } catch (error) {
    return handleApiError(error);
  }
}

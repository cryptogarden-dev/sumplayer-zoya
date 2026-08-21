import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { supplierDeliverySchedulesReplaceSchema } from "@/lib/validation/supplier";
import { replaceSupplierDeliverySchedules } from "@/lib/server/repositories/supplier-repository";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = supplierDeliverySchedulesReplaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data jadwal pengiriman tidak valid.",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const schedules = await replaceSupplierDeliverySchedules(
      session.user.businessId,
      id,
      parsed.data.days,
    );
    if (!schedules) {
      throw new ApiError(404, "Supplier tidak ditemukan.");
    }
    return NextResponse.json({ schedules });
  } catch (error) {
    return handleApiError(error);
  }
}

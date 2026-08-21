import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { shippingRuleInputSchema } from "@/lib/validation/shipping-rule";
import { getShippingRule, upsertShippingRule } from "@/lib/server/repositories/supplier-repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const rule = await getShippingRule(session.user.businessId, id);
    return NextResponse.json({ rule });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = shippingRuleInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data aturan ongkir tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const rule = await upsertShippingRule(
      session.user.businessId,
      id,
      session.user.id,
      parsed.data,
    );
    if (!rule) {
      throw new ApiError(404, "Supplier tidak ditemukan.");
    }
    return NextResponse.json({ rule });
  } catch (error) {
    return handleApiError(error);
  }
}

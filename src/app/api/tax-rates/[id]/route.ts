import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { ONLY_OWNER_ADMIN } from "@/lib/auth/rbac";
import { taxRateUpdateSchema } from "@/lib/validation/tax-rate";
import { updateTaxRate } from "@/lib/server/repositories/tax-rate-repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(ONLY_OWNER_ADMIN);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = taxRateUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tarif pajak tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const rate = await updateTaxRate(session.user.businessId, id, parsed.data);
    if (!rate) {
      throw new ApiError(404, "Tarif pajak tidak ditemukan.");
    }
    return NextResponse.json({ rate });
  } catch (error) {
    return handleApiError(error);
  }
}

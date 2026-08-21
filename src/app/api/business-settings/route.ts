import { NextResponse } from "next/server";
import { handleApiError, requireApiRole } from "@/lib/server/api-auth";
import { ONLY_OWNER_ADMIN, OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { businessSettingsInputSchema } from "@/lib/validation/tax-rate";
import {
  getStaleDataThresholdDays,
  updateStaleDataThresholdDays,
} from "@/lib/server/repositories/business-settings-repository";

export async function GET() {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const staleDataThresholdDays = await getStaleDataThresholdDays(session.user.businessId);
    return NextResponse.json({ staleDataThresholdDays });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Ambang "data lama" dapat dikonfigurasi, khusus Pemilik/Admin (Tahap 3, poin 7). */
export async function PATCH(request: Request) {
  try {
    const session = await requireApiRole(ONLY_OWNER_ADMIN);
    const body: unknown = await request.json().catch(() => null);
    const parsed = businessSettingsInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data pengaturan tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await updateStaleDataThresholdDays(session.user.businessId, parsed.data.staleDataThresholdDays);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

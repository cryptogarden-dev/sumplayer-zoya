import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { ONLY_OWNER_ADMIN } from "@/lib/auth/rbac";
import { setBusinessLocationActive } from "@/lib/server/repositories/business-location-repository";

const statusSchema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(ONLY_OWNER_ADMIN);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
    }

    const updated = await setBusinessLocationActive(
      session.user.businessId,
      id,
      parsed.data.isActive,
    );
    if (!updated) {
      throw new ApiError(404, "Lokasi tidak ditemukan.");
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

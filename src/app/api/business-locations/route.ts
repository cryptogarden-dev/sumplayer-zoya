import { NextResponse } from "next/server";
import { handleApiError, requireApiRole } from "@/lib/server/api-auth";
import { ONLY_OWNER_ADMIN, OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { businessLocationInputSchema } from "@/lib/validation/business-location";
import {
  createBusinessLocation,
  listBusinessLocations,
} from "@/lib/server/repositories/business-location-repository";

/** Membaca daftar lokasi boleh dilakukan Staf (dibutuhkan saat mengisi form Bandingkan/Pesanan). */
export async function GET(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";
    const locations = await listBusinessLocations(session.user.businessId, includeInactive);
    return NextResponse.json({ locations });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Mengelola lokasi/cabang khusus Pemilik/Admin (R26). */
export async function POST(request: Request) {
  try {
    const session = await requireApiRole(ONLY_OWNER_ADMIN);
    const body: unknown = await request.json().catch(() => null);
    const parsed = businessLocationInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data lokasi tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const location = await createBusinessLocation(session.user.businessId, parsed.data);
    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

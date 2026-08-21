import { NextResponse } from "next/server";
import { handleApiError, requireApiRole } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { listOffers } from "@/lib/server/repositories/supplier-product-repository";

/** Daftar produk yang ditawarkan oleh supplier tertentu (R01: "Daftar produk supplier"). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const offers = await listOffers(session.user.businessId, {
      supplierId: id,
      includeInactive: true,
    });
    return NextResponse.json({ offers });
  } catch (error) {
    return handleApiError(error);
  }
}

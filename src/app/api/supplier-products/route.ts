import { NextResponse } from "next/server";
import { handleApiError, requireApiRole } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { supplierProductInputSchema } from "@/lib/validation/supplier-product";
import { createOffer, listOffers } from "@/lib/server/repositories/supplier-product-repository";

export async function GET(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId") ?? undefined;
    const supplierId = url.searchParams.get("supplierId") ?? undefined;
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    const offers = await listOffers(session.user.businessId, {
      productId,
      supplierId,
      includeInactive,
    });
    return NextResponse.json({ offers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const body: unknown = await request.json().catch(() => null);
    const parsed = supplierProductInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data penawaran tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const offer = await createOffer(session.user.businessId, session.user.id, parsed.data);
    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

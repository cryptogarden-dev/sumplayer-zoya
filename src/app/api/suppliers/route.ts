import { NextResponse } from "next/server";
import { handleApiError, requireApiRole } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { searchSupplierQuerySchema, supplierInputSchema } from "@/lib/validation/supplier";
import { createSupplier, listSuppliers } from "@/lib/server/repositories/supplier-repository";

export async function GET(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const url = new URL(request.url);
    const query = searchSupplierQuerySchema.parse({
      q: url.searchParams.get("q") ?? undefined,
      city: url.searchParams.get("city") ?? undefined,
      area: url.searchParams.get("area") ?? undefined,
      includeInactive: url.searchParams.get("includeInactive") ?? undefined,
    });

    const suppliers = await listSuppliers(session.user.businessId, query);
    return NextResponse.json({ suppliers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const body: unknown = await request.json().catch(() => null);
    const parsed = supplierInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data supplier tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const supplier = await createSupplier(session.user.businessId, session.user.id, parsed.data);
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

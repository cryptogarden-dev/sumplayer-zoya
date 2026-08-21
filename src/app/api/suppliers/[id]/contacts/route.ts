import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { supplierContactInputSchema } from "@/lib/validation/supplier";
import {
  addSupplierContact,
  listSupplierContacts,
} from "@/lib/server/repositories/supplier-repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const contacts = await listSupplierContacts(session.user.businessId, id);
    return NextResponse.json({ contacts });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = supplierContactInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data kontak tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const contact = await addSupplierContact(session.user.businessId, id, parsed.data);
    if (!contact) {
      throw new ApiError(404, "Supplier tidak ditemukan.");
    }
    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { handleApiError, requireApiRole } from "@/lib/server/api-auth";
import { ONLY_OWNER_ADMIN, OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { taxRateInputSchema } from "@/lib/validation/tax-rate";
import { createTaxRate, listTaxRates } from "@/lib/server/repositories/tax-rate-repository";

/** Membaca daftar tarif pajak boleh dilakukan Staf (dibutuhkan saat membuat penawaran). */
export async function GET(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";
    const rates = await listTaxRates(session.user.businessId, includeInactive);
    return NextResponse.json({ rates });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Mengelola tarif pajak (membuat/mengubah) khusus Pemilik/Admin (R07, R26). */
export async function POST(request: Request) {
  try {
    const session = await requireApiRole(ONLY_OWNER_ADMIN);
    const body: unknown = await request.json().catch(() => null);
    const parsed = taxRateInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tarif pajak tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const rate = await createTaxRate(session.user.businessId, session.user.id, parsed.data);
    return NextResponse.json({ rate }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

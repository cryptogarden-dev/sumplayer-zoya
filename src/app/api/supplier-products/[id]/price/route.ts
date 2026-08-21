import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { priceTaxInputSchema } from "@/lib/validation/supplier-product";
import {
  addPriceHistoryEntry,
  getPriceHistory,
} from "@/lib/server/repositories/supplier-product-repository";

/** Riwayat harga (R20 - append-only, read-only lewat GET). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const history = await getPriceHistory(session.user.businessId, id);
    return NextResponse.json({ history });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Menambah entri harga baru (R20). TIDAK PERNAH mengubah/menghapus baris
 * lama - setiap perubahan harga SELALU menjadi baris baru.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = priceTaxInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data harga tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const entry = await addPriceHistoryEntry(
      session.user.businessId,
      session.user.id,
      id,
      parsed.data,
    );
    if (!entry) {
      throw new ApiError(404, "Penawaran tidak ditemukan.");
    }
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

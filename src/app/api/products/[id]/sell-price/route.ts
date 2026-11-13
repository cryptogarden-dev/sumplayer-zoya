import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { setSellPrice } from "@/lib/server/repositories/product-repository";

/**
 * Setel harga jual produk saja (fitur "Rekomendasi Jual", 2026-11-13).
 * Dipakai tombol "Pakai sebagai Harga Jual" — sengaja terpisah dari PATCH
 * /api/products/[id] supaya tidak perlu mengirim ulang seluruh field
 * produk dan tidak menimpa edit form yang belum disimpan.
 */
const sellPriceSchema = z.object({
  sellPricePerBaseUnit: z.number().nonnegative("Harga jual tidak boleh negatif").nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = sellPriceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Harga jual tidak valid." }, { status: 400 });
    }

    const updated = await setSellPrice(
      session.user.businessId,
      id,
      parsed.data.sellPricePerBaseUnit,
    );
    if (!updated) {
      throw new ApiError(404, "Produk tidak ditemukan.");
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

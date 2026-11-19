import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { setEceranPrice, setSellPrice } from "@/lib/server/repositories/product-repository";

/**
 * Setel harga jual produk saja (fitur "Rekomendasi Jual", 2026-11-13).
 * Dipakai tombol "Pakai sebagai Harga Jual" — sengaja terpisah dari PATCH
 * /api/products/[id] supaya tidak perlu mengirim ulang seluruh field
 * produk dan tidak menimpa edit form yang belum disimpan.
 * Sejak Stok Fleksibel (2026-11-19) juga menerima harga jual eceran;
 * kedua field opsional, tapi paling tidak satu harus dikirim.
 */
const sellPriceSchema = z
  .object({
    sellPricePerBaseUnit: z
      .number()
      .nonnegative("Harga jual tidak boleh negatif")
      .nullable()
      .optional(),
    eceranPricePerBaseUnit: z
      .number()
      .nonnegative("Harga jual eceran tidak boleh negatif")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => data.sellPricePerBaseUnit !== undefined || data.eceranPricePerBaseUnit !== undefined,
    { message: "Tidak ada harga yang dikirim." },
  );

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = sellPriceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Harga jual tidak valid." }, { status: 400 });
    }

    if (parsed.data.sellPricePerBaseUnit !== undefined) {
      const updated = await setSellPrice(
        session.user.businessId,
        id,
        parsed.data.sellPricePerBaseUnit,
      );
      if (!updated) {
        throw new ApiError(404, "Produk tidak ditemukan.");
      }
    }
    if (parsed.data.eceranPricePerBaseUnit !== undefined) {
      const updated = await setEceranPrice(
        session.user.businessId,
        id,
        parsed.data.eceranPricePerBaseUnit,
      );
      if (!updated) {
        throw new ApiError(404, "Produk tidak ditemukan.");
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

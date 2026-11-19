import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { adjustStock } from "@/lib/server/repositories/product-repository";

/**
 * Setel stok toko produk (Stok Fleksibel, 2026-11-19) — dipakai tombol
 * +/- dan input angka di Stok Toko. `stockQty` dalam satuan dasar;
 * `unitLabel` + `unitDelta` mencatat perubahan dalam satuan tampil
 * untuk riwayat (mis. "-1 Renceng"). Stok tidak boleh negatif.
 */
const stockSchema = z.object({
  stockQty: z.number().nonnegative("Stok tidak boleh negatif"),
  unitLabel: z.string().trim().min(1).max(32),
  unitDelta: z.number(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = stockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Jumlah stok tidak valid." }, { status: 400 });
    }

    const updated = await adjustStock(
      session.user.businessId,
      session.user.id,
      id,
      parsed.data.stockQty,
      {
        unitLabel: parsed.data.unitLabel,
        unitQuantity: parsed.data.unitDelta,
        note: "Penyesuaian manual dari Stok Toko",
      },
    );
    if (!updated) {
      throw new ApiError(404, "Produk tidak ditemukan.");
    }
    return NextResponse.json({
      success: true,
      stockQty: updated.stockQty,
      deltaBase: updated.deltaBase,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

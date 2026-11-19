import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { recordSale } from "@/lib/server/repositories/product-repository";

/**
 * Catat satu penjualan + kurangi stok (Stok Fleksibel, 2026-11-19).
 * `unit` = "package" (per kemasan termurah) atau "base" (per satuan
 * dasar). Harga dihitung di server dari harga yang tersimpan, jadi
 * klien tidak bisa mengubah harga lewat request ini.
 */
const sellSchema = z.object({
  unit: z.enum(["package", "base"]),
  quantity: z.number().positive("Jumlah jual harus lebih dari 0"),
  unitLabel: z.string().trim().min(1).max(32),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = sellSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Data penjualan tidak valid." }, { status: 400 });
    }

    const sale = await recordSale(session.user.businessId, session.user.id, id, {
      unit: parsed.data.unit,
      quantity: parsed.data.quantity,
      unitLabel: parsed.data.unitLabel,
    });
    if (!sale) {
      throw new ApiError(404, "Produk tidak ditemukan.");
    }
    return NextResponse.json({
      success: true,
      stockQty: sale.stockQty,
      totalAmount: sale.totalAmount,
      unitLabel: sale.unitLabel,
      unitQuantity: sale.unitQuantity,
      unitPrice: sale.unitPrice,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

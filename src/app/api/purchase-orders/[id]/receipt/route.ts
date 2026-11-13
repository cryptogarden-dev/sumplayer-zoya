import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { goodsReceiptInputSchema } from "@/lib/validation/goods-receipt";
import {
  createGoodsReceipt,
  getGoodsReceiptByOrder,
} from "@/lib/server/repositories/goods-receipt-repository";

/**
 * Penerimaan barang (R18): POST mencatat penerimaan untuk satu pesanan
 * (status jadi DITERIMA, stok toko bertambah, kinerja supplier
 * direkomputasi), GET mengambil penerimaan yang sudah dicatat.
 * Satu pesanan = satu penerimaan di v1 — POST kedua ditolak server.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = goodsReceiptInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data penerimaan tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const receipt = await createGoodsReceipt(
      session.user.businessId,
      id,
      session.user.id,
      parsed.data,
    );
    if (!receipt) {
      throw new ApiError(404, "Pesanan tidak ditemukan.");
    }
    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const receipt = await getGoodsReceiptByOrder(session.user.businessId, id);
    if (!receipt) {
      throw new ApiError(404, "Belum ada penerimaan barang untuk pesanan ini.");
    }
    return NextResponse.json({ receipt });
  } catch (error) {
    return handleApiError(error);
  }
}

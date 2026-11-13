import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { recordPaymentSchema } from "@/lib/validation/purchase-order";
import { recordPayment } from "@/lib/server/repositories/purchase-order-repository";

/**
 * Catat pembayaran pesanan yang sudah dikonfirmasi (perbaikan #4).
 * Jumlah kumulatif; status bayar (DP/Lunas) dihitung server dari total
 * pesanan — pembayaran melebihi sisa tagihan ditolak.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Jumlah pembayaran tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const order = await recordPayment(session.user.businessId, id, parsed.data.amount);
    if (!order) {
      throw new ApiError(404, "Pesanan tidak ditemukan.");
    }
    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { deleteSale } from "@/lib/server/repositories/product-repository";

/**
 * Hapus satu penjualan dari halaman Penjualan (kepencet / salah catat).
 * Stok produk dikembalikan sejumlah yang terjual, dalam transaksi yang
 * sama dengan penghapusan riwayatnya.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const deleted = await deleteSale(session.user.businessId, id);
    if (!deleted) {
      throw new ApiError(404, "Penjualan tidak ditemukan.");
    }
    return NextResponse.json({ success: true, stockQty: deleted.stockQty });
  } catch (error) {
    return handleApiError(error);
  }
}

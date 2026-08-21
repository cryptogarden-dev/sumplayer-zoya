import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { ONLY_OWNER_ADMIN, OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { productInputSchema } from "@/lib/validation/product";
import {
  deleteProduct,
  getProductById,
  isSkuTaken,
  updateProduct,
} from "@/lib/server/repositories/product-repository";
import { listOffers } from "@/lib/server/repositories/supplier-product-repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const product = await getProductById(session.user.businessId, id);
    if (!product) {
      throw new ApiError(404, "Produk tidak ditemukan.");
    }
    const offers = await listOffers(session.user.businessId, {
      productId: id,
      includeInactive: true,
    });
    return NextResponse.json({ product, offers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = productInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data produk tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    if (await isSkuTaken(session.user.businessId, parsed.data.sku, id)) {
      throw new ApiError(409, "SKU sudah dipakai produk lain di bisnis ini.");
    }

    const product = await updateProduct(session.user.businessId, id, parsed.data);
    if (!product) {
      throw new ApiError(404, "Produk tidak ditemukan.");
    }
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Hapus permanen (docs/BACKLOG.md #5). Ditolak dengan `DeletionBlockedError`
 * (dipetakan `handleApiError` -> 400) jika produk sudah pernah dipesan -
 * gunakan status nonaktif untuk kasus itu.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(ONLY_OWNER_ADMIN);
    const { id } = await params;
    const deleted = await deleteProduct(session.user.businessId, id);
    if (!deleted) {
      throw new ApiError(404, "Produk tidak ditemukan.");
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { handleApiError, requireApiRole } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { comparisonQuerySchema } from "@/lib/validation/comparison";
import {
  buildComparison,
  serializeComparisonResult,
  ProductNotFoundError,
} from "@/lib/server/comparison/build-comparison";
import { IncompatibleUnitError } from "@/lib/domain";

/**
 * GET /api/comparison — hasil perbandingan harga & rekomendasi supplier
 * untuk satu produk (Tahap 4, R12). Query-string, bukan body, karena ini
 * operasi baca (idempoten) mengikuti konvensi REST proyek (ARCHITECTURE.md §3).
 */
export async function GET(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const url = new URL(request.url);
    const query = comparisonQuerySchema.parse({
      productId: url.searchParams.get("productId") ?? undefined,
      neededQuantity: url.searchParams.get("neededQuantity") ?? undefined,
      neededUnit: url.searchParams.get("neededUnit") ?? undefined,
      province: url.searchParams.get("province") ?? undefined,
      city: url.searchParams.get("city") ?? undefined,
      district: url.searchParams.get("district") ?? undefined,
      neededByDate: url.searchParams.get("neededByDate") ?? undefined,
    });

    const result = await buildComparison({
      businessId: session.user.businessId,
      productId: query.productId,
      neededQuantity: query.neededQuantity,
      neededUnit: query.neededUnit,
      destination: { province: query.province, city: query.city, district: query.district },
      neededByDate: new Date(query.neededByDate),
    });

    return NextResponse.json(serializeComparisonResult(result));
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof IncompatibleUnitError) {
      return NextResponse.json(
        { error: "Satuan kebutuhan tidak sesuai dengan dimensi produk ini." },
        { status: 400 },
      );
    }
    return handleApiError(error);
  }
}

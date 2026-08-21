import { NextResponse } from "next/server";
import { handleApiError, requireApiRole, ApiError } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { productInputSchema, searchProductQuerySchema } from "@/lib/validation/product";
import {
  createProduct,
  isSkuTaken,
  listProducts,
} from "@/lib/server/repositories/product-repository";

export async function GET(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const url = new URL(request.url);
    const query = searchProductQuerySchema.parse({
      q: url.searchParams.get("q") ?? undefined,
      categoryId: url.searchParams.get("categoryId") ?? undefined,
      includeInactive: url.searchParams.get("includeInactive") ?? undefined,
    });

    const products = await listProducts(session.user.businessId, query);
    return NextResponse.json({ products });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const body: unknown = await request.json().catch(() => null);
    const parsed = productInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data produk tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    if (await isSkuTaken(session.user.businessId, parsed.data.sku)) {
      throw new ApiError(409, "SKU sudah dipakai produk lain di bisnis ini.");
    }

    const product = await createProduct(session.user.businessId, session.user.id, parsed.data);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

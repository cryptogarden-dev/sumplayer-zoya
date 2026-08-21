import { NextResponse } from "next/server";
import { Prisma } from "@generated/prisma/client";
import { handleApiError, requireApiRole } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import { productCategoryInputSchema } from "@/lib/validation/product";
import {
  createProductCategory,
  listProductCategories,
} from "@/lib/server/repositories/product-repository";

export async function GET() {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const categories = await listProductCategories(session.user.businessId);
    return NextResponse.json({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);
    const body: unknown = await request.json().catch(() => null);
    const parsed = productCategoryInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Nama kategori tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const category = await createProductCategory(session.user.businessId, parsed.data.name);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Nama kategori sudah dipakai." }, { status: 409 });
    }
    return handleApiError(error);
  }
}

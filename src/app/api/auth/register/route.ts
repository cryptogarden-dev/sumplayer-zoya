import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { registerBusinessSchema } from "@/lib/validation/auth";
import { BusinessUserRole } from "@generated/prisma/browser";

/**
 * Pendaftaran usaha baru + pemilik pertama (R26, ARCHITECTURE.md §5).
 * Endpoint ini publik (tidak memerlukan sesi) karena inilah cara satu-
 * satunya usaha baru dapat dibuat. Staf berikutnya ditambahkan oleh
 * Pemilik/Admin dari dalam aplikasi pada tahap berikutnya.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = registerBusinessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Data pendaftaran tidak valid.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { businessName, ownerName, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    return NextResponse.json(
      { error: "Email sudah terdaftar. Silakan masuk atau gunakan email lain." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: { name: businessName, ownerName },
    });

    const user = await tx.user.create({
      data: { name: ownerName, email: normalizedEmail, passwordHash },
    });

    await tx.businessUser.create({
      data: {
        businessId: business.id,
        userId: user.id,
        role: BusinessUserRole.owner_admin,
      },
    });
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

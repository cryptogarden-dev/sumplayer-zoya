import { prisma } from "@/lib/db/prisma";
import { BusinessUserRole } from "@generated/prisma/browser";

/**
 * Helper pembuatan data uji terisolasi untuk integration test repository
 * Tahap 3. Setiap test SEBAIKNYA membuat bisnis sendiri (bukan berbagi data
 * antar test) agar isolasi tenant benar-benar teruji dan pembersihan mudah
 * (cascade delete lewat `deleteTestBusiness`).
 */
export interface TestBusinessContext {
  businessId: string;
  ownerUserId: string;
  staffUserId: string;
}

let counter = 0;

function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Database dev lokal (Prisma dev - wasm Postgres) kadang memutus koneksi
 * secara sesaat/acak di bawah beban test integrasi (masalah lingkungan
 * dev, bukan bug aplikasi). Retry sederhana ini mengurangi flakiness tanpa
 * menyembunyikan kegagalan yang konsisten (tetap gagal bila error berulang).
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
  throw lastError;
}

export async function createTestBusiness(label = "Bisnis Uji"): Promise<TestBusinessContext> {
  const suffix = uniqueSuffix();

  return withRetry(async () => {
    const business = await prisma.business.create({
      data: { name: `${label} ${suffix}`, ownerName: "Pemilik Uji" },
    });

    const ownerUser = await prisma.user.create({
      data: {
        name: "Pemilik Uji",
        email: `owner-${suffix}@test.local`,
        passwordHash: "not-used-in-tests",
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        name: "Staf Uji",
        email: `staff-${suffix}@test.local`,
        passwordHash: "not-used-in-tests",
      },
    });

    await prisma.businessUser.create({
      data: { businessId: business.id, userId: ownerUser.id, role: BusinessUserRole.owner_admin },
    });
    await prisma.businessUser.create({
      data: { businessId: business.id, userId: staffUser.id, role: BusinessUserRole.staff },
    });

    return { businessId: business.id, ownerUserId: ownerUser.id, staffUserId: staffUser.id };
  });
}

/** Menghapus bisnis uji beserta seluruh data turunannya (cascade FK). */
export async function deleteTestBusiness(businessId: string): Promise<void> {
  await withRetry(() => prisma.business.delete({ where: { id: businessId } })).catch(
    () => undefined,
  );
}

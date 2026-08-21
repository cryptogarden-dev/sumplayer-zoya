import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { Session } from "next-auth";
import { getCurrentSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import type { BusinessUserRole } from "@generated/prisma/browser";

/**
 * Helper autentikasi/otorisasi khusus Route Handler (`app/api/**`).
 *
 * Berbeda dari `requireSession`/`requireRole` di `src/lib/auth/session.ts`
 * (yang me-redirect, cocok untuk Server Component halaman), API JSON harus
 * mengembalikan status HTTP 401/403 dengan body JSON agar dapat ditangani
 * `fetch()` di client tanpa mengikuti redirect ke halaman HTML login.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requireApiSession(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session || !session.user?.businessId) {
    throw new ApiError(401, "Anda harus masuk untuk mengakses data ini.");
  }
  return session;
}

export async function requireApiRole(allowed: readonly BusinessUserRole[]): Promise<Session> {
  const session = await requireApiSession();
  if (!hasRole(session.user.role, allowed)) {
    throw new ApiError(403, "Anda tidak memiliki hak akses untuk melakukan aksi ini.");
  }
  return session;
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, issues: error.issues },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Data tidak valid.", issues: error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Terjadi kesalahan tak terduga." }, { status: 500 });
}

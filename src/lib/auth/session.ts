import "server-only";
import { cache } from "react";
import { getServerSession, type Session } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth-options";
import { hasRole } from "@/lib/auth/rbac";
import type { BusinessUserRole } from "@generated/prisma/browser";

/**
 * Sesi dari JWT (NextAuth Credentials, tanpa query database). Di-cache
 * per request (perbaikan kecepatan 2026-11-13): layout dashboard DAN
 * halaman di bawahnya sama-sama memanggil `requireSession`, dan tanpa
 * cache ini JWT di-decode dua kali per request.
 */
export const getCurrentSession = cache(async (): Promise<Session | null> => {
  return getServerSession(authOptions);
});

/**
 * Mewajibkan sesi login. Mengarahkan ke /login jika belum masuk.
 * Middleware (src/middleware.ts) sudah melakukan pengecekan serupa di edge,
 * fungsi ini adalah lapisan pertahanan kedua di level server component
 * (defense in depth untuk R26).
 */
export async function requireSession(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session || !session.user?.businessId) {
    redirect("/login");
  }
  return session as Session;
}

/**
 * Mewajibkan sesi login DAN peran tertentu. Mengarahkan ke /unauthorized
 * jika peran tidak memenuhi syarat.
 */
export async function requireRole(allowed: readonly BusinessUserRole[]): Promise<Session> {
  const session = await requireSession();
  if (!hasRole(session.user.role, allowed)) {
    redirect("/unauthorized");
  }
  return session;
}

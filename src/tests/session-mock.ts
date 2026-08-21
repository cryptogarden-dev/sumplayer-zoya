import type { Session } from "next-auth";
import type { BusinessUserRole } from "@generated/prisma/browser";

/**
 * Factory data sesi untuk test hak akses (RBAC) pada Route Handler.
 * Pemasangan mock (`vi.mock("@/lib/auth/session", ...)`) TETAP harus
 * ditulis di masing-masing file test (bukan di sini) agar hoisting Vitest
 * bekerja dengan benar - lihat pola `vi.hoisted()` di file test terkait.
 */
export function buildSession(
  role: BusinessUserRole,
  overrides: Partial<Session["user"]> = {},
): Session {
  return {
    user: {
      id: overrides.id ?? "user-1",
      name: overrides.name ?? "Pengguna Uji",
      email: overrides.email ?? "user@test.local",
      businessId: overrides.businessId ?? "business-1",
      businessName: overrides.businessName ?? "Bisnis Uji",
      role,
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  };
}

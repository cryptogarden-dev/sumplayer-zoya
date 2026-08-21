import { BusinessUserRole } from "@generated/prisma/browser";

/**
 * Aturan hak akses dasar (R26): Pemilik/Admin dan Staf.
 * Fungsi ini murni (tanpa efek samping) agar mudah diuji unit.
 */
export function hasRole(
  role: BusinessUserRole | undefined | null,
  allowed: readonly BusinessUserRole[],
): boolean {
  if (!role) return false;
  return allowed.includes(role);
}

export const ROLE_LABELS: Record<BusinessUserRole, string> = {
  [BusinessUserRole.owner_admin]: "Pemilik/Admin",
  [BusinessUserRole.staff]: "Staf",
};

export const ONLY_OWNER_ADMIN: readonly BusinessUserRole[] = [BusinessUserRole.owner_admin];
export const OWNER_ADMIN_AND_STAFF: readonly BusinessUserRole[] = [
  BusinessUserRole.owner_admin,
  BusinessUserRole.staff,
];

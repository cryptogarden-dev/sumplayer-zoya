import { describe, expect, it } from "vitest";
import { BusinessUserRole } from "@generated/prisma/browser";
import { hasRole, ROLE_LABELS, ONLY_OWNER_ADMIN, OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";

describe("hasRole (R26 - hak akses dasar)", () => {
  it("mengizinkan akses jika peran ada dalam daftar yang diizinkan", () => {
    expect(hasRole(BusinessUserRole.owner_admin, ONLY_OWNER_ADMIN)).toBe(true);
  });

  it("menolak akses staf pada halaman khusus Pemilik/Admin", () => {
    expect(hasRole(BusinessUserRole.staff, ONLY_OWNER_ADMIN)).toBe(false);
  });

  it("menolak akses jika peran tidak diketahui", () => {
    expect(hasRole(undefined, OWNER_ADMIN_AND_STAFF)).toBe(false);
    expect(hasRole(null, OWNER_ADMIN_AND_STAFF)).toBe(false);
  });

  it("mengizinkan Staf dan Pemilik/Admin saat keduanya diizinkan", () => {
    expect(hasRole(BusinessUserRole.staff, OWNER_ADMIN_AND_STAFF)).toBe(true);
    expect(hasRole(BusinessUserRole.owner_admin, OWNER_ADMIN_AND_STAFF)).toBe(true);
  });
});

describe("ROLE_LABELS", () => {
  it("menyediakan label Bahasa Indonesia untuk setiap peran", () => {
    expect(ROLE_LABELS[BusinessUserRole.owner_admin]).toBe("Pemilik/Admin");
    expect(ROLE_LABELS[BusinessUserRole.staff]).toBe("Staf");
  });
});

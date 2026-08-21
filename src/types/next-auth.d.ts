import type { BusinessUserRole } from "@generated/prisma/browser";
import type { DefaultSession, DefaultUser } from "next-auth";

/**
 * Augmentasi tipe NextAuth agar konteks bisnis & peran (R26) tersedia di
 * seluruh session/token secara type-safe.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      businessId: string;
      businessName: string;
      role: BusinessUserRole;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    businessId: string;
    businessName: string;
    role: BusinessUserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    businessId: string;
    businessName: string;
    role: BusinessUserRole;
  }
}

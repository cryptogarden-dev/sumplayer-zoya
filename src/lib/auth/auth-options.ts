import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validation/auth";

/**
 * Konfigurasi autentikasi (R26, ARCHITECTURE.md §5).
 *
 * Catatan implementasi (koreksi dari rencana awal di ARCHITECTURE.md §5):
 * NextAuth v4 mensyaratkan strategi sesi "jwt" ketika memakai Credentials
 * Provider (sesi berbasis database tidak didukung untuk provider ini karena
 * tidak melalui alur linking akun OAuth adapter). Untuk tetap mendekati
 * niat awal (revocation saat staf dinonaktifkan), setiap login memvalidasi
 * ulang status aktif user & keanggotaan bisnis langsung dari database, dan
 * masa berlaku token dibatasi (maxAge) agar akses yang dicabut tidak
 * bertahan tanpa batas waktu.
 */
export const authOptions: NextAuthOptions = {
  // Eksplisit memakai `AUTH_SECRET` (BUKAN `NEXTAUTH_SECRET` bawaan
  // NextAuth v4) supaya konsisten dengan `src/proxy.ts` yang memverifikasi
  // token dengan variabel yang sama - kalau tidak disamakan, produksi bisa
  // gagal (NextAuth v4 default membaca `NEXTAUTH_SECRET`, sedangkan
  // `.env.example`/README proyek ini mendokumentasikan `AUTH_SECRET`).
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12, // 12 jam
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email dan kata sandi",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata Sandi", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            businessUsers: {
              where: { isActive: true },
              include: { business: true },
            },
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const passwordValid = await verifyPassword(password, user.passwordHash);
        if (!passwordValid) {
          return null;
        }

        // R26: pengguna hanya boleh masuk jika memiliki keanggotaan aktif
        // pada bisnis yang juga masih aktif.
        const activeMembership = user.businessUsers.find((bu) => bu.business.isActive);
        if (!activeMembership) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          businessId: activeMembership.businessId,
          businessName: activeMembership.business.name,
          role: activeMembership.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.businessId = user.businessId;
        token.businessName = user.businessName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.businessId = token.businessId;
        session.user.businessName = token.businessName;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Proteksi rute dasar (R26). Semua rute dashboard mewajibkan sesi login;
 * pemeriksaan peran spesifik (mis. khusus Pemilik/Admin) dilakukan di
 * level server component lewat requireRole (src/lib/auth/session.ts) untuk
 * defense in depth.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/supplier/:path*",
    "/produk/:path*",
    "/bandingkan/:path*",
    "/pesanan/:path*",
    "/unauthorized",
    "/dev/:path*",
  ],
};

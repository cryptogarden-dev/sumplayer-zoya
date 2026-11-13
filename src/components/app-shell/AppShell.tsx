import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { Header } from "@/components/app-shell/Header";
import { Sidebar } from "@/components/app-shell/Sidebar";
import { BottomNav } from "@/components/app-shell/BottomNav";

/**
 * Application shell responsif (poin 12 permintaan Tahap 1):
 * - Sidebar tampil di desktop (lg ke atas).
 * - BottomNav tampil di mobile (di bawah lg).
 * - Konten utama diberi padding bawah ekstra di mobile agar tidak
 *   tertutup BottomNav (R24: tanpa horizontal scroll mengganggu, dan
 *   konten tetap terjangkau).
 */
export function AppShell({
  session,
  cartCount,
  children,
}: {
  session: Session;
  cartCount: number;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar />
      {/* min-w-0: tanpa ini, item flex tidak mau mengecil di bawah lebar
          minimum kontennya (R24) — grid 4 kolom di halaman Produk
          mendorong seluruh halaman lebih lebar dari viewport sehingga
          kolom ke-4 terpotong dan muncul horizontal scroll. */}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Header session={session} cartCount={cartCount} />
        <main className="flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-10 lg:pt-8 lg:pb-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}

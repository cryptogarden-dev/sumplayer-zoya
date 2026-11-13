import Link from "next/link";
import type { Session } from "next-auth";
import { ProfileMenu } from "@/components/app-shell/ProfileMenu";
import { NavIcon } from "@/components/app-shell/NavIcon";
import { LogoZoya } from "@/components/app-shell/LogoZoya";

export function Header({ session, cartCount }: { session: Session; cartCount: number }) {
  return (
    <header className="border-divider sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6 lg:justify-end lg:px-8">
      <Link href="/" className="flex items-center gap-2.5 lg:hidden" aria-label="Beranda Zoya">
        <LogoZoya size={36} />
        <span className="font-display text-slate text-xl font-semibold">Zoya</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/pesanan"
          className="text-mist hover:bg-page hover:text-slate focus-visible:outline-slate relative flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={
            cartCount > 0 ? `Keranjang, ${cartCount} item menunggu dikonfirmasi` : "Keranjang"
          }
          title="Pesanan (keranjang)"
        >
          <NavIcon name="shoppingCart" className="h-5 w-5" />
          {cartCount > 0 ? (
            <span className="bg-slate absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          ) : null}
        </Link>
        <ProfileMenu
          name={session.user.name ?? "Pengguna"}
          email={session.user.email ?? ""}
          businessName={session.user.businessName}
          role={session.user.role}
        />
      </div>
    </header>
  );
}

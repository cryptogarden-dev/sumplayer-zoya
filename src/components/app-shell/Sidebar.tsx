"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "@/components/app-shell/nav-items";
import { NavIcon } from "@/components/app-shell/NavIcon";
import { LogoZoya } from "@/components/app-shell/LogoZoya";

/**
 * Sidebar navigasi untuk layar desktop (R24: "Pada desktop gunakan
 * sidebar"). Disembunyikan pada layar mobile lewat `hidden lg:flex`.
 * Gaya brand Zoya (docs/design/DESIGN_SPEC.md): lebar 260px, putih,
 * logo 44px + "Zoya" serif + sub-label "GROSIR SEMBAKO", item 44px
 * radius 12 — aktif bg nav-active teks slate bold, tidak aktif mist.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-divider hidden w-[260px] shrink-0 border-r bg-white px-5 py-7 lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-3 px-1">
        <LogoZoya />
        <span className="leading-none">
          <span className="font-display text-slate block text-[22px] font-semibold">Zoya</span>
          <span className="text-mist mt-1 block text-[9px] font-medium tracking-[3px]">
            GROSIR SEMBAKO
          </span>
        </span>
      </Link>
      <nav aria-label="Navigasi utama" className="mt-8 flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                active
                  ? "bg-navactive text-slate font-semibold"
                  : "text-mist hover:bg-page hover:text-slate font-medium",
              )}
            >
              <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

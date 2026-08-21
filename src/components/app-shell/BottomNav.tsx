"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "@/components/app-shell/nav-items";
import { NavIcon } from "@/components/app-shell/NavIcon";

/**
 * Navigasi bawah untuk layar mobile (R24: "Pada HP gunakan bottom
 * navigation"). Disembunyikan pada layar desktop lewat `lg:hidden`.
 * Area sentuh setiap item minimal 44px sesuai R24 ("tombol besar dan
 * mudah digunakan").
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium",
              active ? "text-indigo-600" : "text-slate-500",
            )}
          >
            <NavIcon name={item.icon} className="h-6 w-6" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

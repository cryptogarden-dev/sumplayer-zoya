"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { signOut } from "next-auth/react";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { NavIcon } from "@/components/app-shell/NavIcon";
import { BusinessUserRole } from "@generated/prisma/browser";

interface ProfileMenuProps {
  name: string;
  email: string;
  businessName: string;
  role: BusinessUserRole;
}

/**
 * Menu profil di header (poin 16 permintaan Tahap 1). Tombol "Keluar" di
 * sini benar-benar berfungsi (memanggil signOut NextAuth), bukan placeholder.
 */
export function ProfileMenu({ name, email, businessName, role }: ProfileMenuProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center gap-2 rounded-full border border-slate-200 px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          aria-label={`Menu profil untuk ${name}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {initial}
          </span>
          <NavIcon name="chevronDown" className="h-4 w-4 text-slate-400" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {businessName} &middot; {ROLE_LABELS[role]}
            </p>
          </div>
          {role === BusinessUserRole.owner_admin ? (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
              <DropdownMenu.Item asChild>
                <Link
                  href="/pengaturan/lokasi"
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100"
                >
                  <NavIcon name="mapPin" className="h-4 w-4" />
                  Lokasi/Cabang
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/pengaturan/pajak"
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100"
                >
                  <NavIcon name="receipt" className="h-4 w-4" />
                  Tarif Pajak
                </Link>
              </DropdownMenu.Item>
            </>
          ) : null}
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
          <DropdownMenu.Item
            onSelect={() => {
              void signOut({ callbackUrl: "/login" });
            }}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium text-red-600 outline-none hover:bg-red-50 focus:bg-red-50"
          >
            <NavIcon name="logOut" className="h-4 w-4" />
            Keluar
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

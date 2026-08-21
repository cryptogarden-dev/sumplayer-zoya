import Link from "next/link";
import type { Session } from "next-auth";
import { ProfileMenu } from "@/components/app-shell/ProfileMenu";

export function Header({ session }: { session: Session }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:justify-end lg:px-8">
      <Link href="/" className="text-base font-semibold text-indigo-600 lg:hidden">
        Supplier &amp; Harga
      </Link>
      <ProfileMenu
        name={session.user.name ?? "Pengguna"}
        email={session.user.email ?? ""}
        businessName={session.user.businessName}
        role={session.user.role}
      />
    </header>
  );
}

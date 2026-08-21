import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell/AppShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  return <AppShell session={session}>{children}</AppShell>;
}

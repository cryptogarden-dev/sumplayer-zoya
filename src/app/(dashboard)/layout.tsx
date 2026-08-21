import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/session";
import { countDraftOrderItems } from "@/lib/server/repositories/purchase-order-repository";
import { AppShell } from "@/components/app-shell/AppShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const cartCount = await countDraftOrderItems(session.user.businessId);
  return (
    <AppShell session={session} cartCount={cartCount}>
      {children}
    </AppShell>
  );
}

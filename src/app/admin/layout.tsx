import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const user = await requireAdmin();

  return (
    <AppShell user={user}>
      {children}
    </AppShell>
  );
}
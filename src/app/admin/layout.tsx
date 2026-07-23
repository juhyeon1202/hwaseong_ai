import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  await requireAdmin();

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 sm:-mt-8">
      <AdminNav />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}
import type {
  ReactNode,
} from "react";

import {
  AdminNav,
} from "@/components/admin-nav";
import {
  requireAdmin,
} from "@/lib/auth";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  await requireAdmin();

  return (
    <div className="-mx-4 -mt-6 bg-page sm:-mx-6 sm:-mt-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col lg:flex-row">
        <AdminNav />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
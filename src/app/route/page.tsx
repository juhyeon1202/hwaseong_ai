import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { RoutePlanner } from "@/components/route-planner";
import { Badge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "대체 경로 찾기",
};

export default async function RoutePage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user}>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header>
          <Badge>카카오맵 실시간 경로</Badge>

          <h1 className="mt-4 text-2xl font-bold text-main sm:text-3xl">
            대체 경로 찾기
          </h1>

          <p className="mt-2 text-sm leading-6 text-secondary">
            교통 불편이 발생한 경우 이용 가능한
            다른 대중교통 경로를 확인하세요.
          </p>
        </header>

        <RoutePlanner />
      </div>
    </AppShell>
  );
}
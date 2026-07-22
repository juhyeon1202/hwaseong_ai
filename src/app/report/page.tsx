import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { ReportPanel } from "@/components/report-panel";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "익명 교통 신고",
  description:
    "정류장 반경 50m 안에서 교통 불편을 익명으로 신고합니다.",
};

export default async function ReportPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user}>
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <p className="text-sm font-semibold text-brand-text">
            정류장 원터치 신고
          </p>

          <h1 className="mt-2 text-2xl font-bold text-main">
            지금 어떤 불편이 있었나요?
          </h1>

          <p className="mt-2 text-sm leading-6 text-secondary">
            현재 위치는 정류장 반경 50m 확인에만
            사용하며 데이터베이스에는 저장하지
            않습니다.
          </p>
        </header>

        <ReportPanel />
      </div>
    </AppShell>
  );
}
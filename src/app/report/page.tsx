import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { ReportPanel } from "@/components/report-panel";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "정류장 원터치 신고",
  description:
    "정류장 반경 500m 안에서 교통 불편을 익명으로 신고합니다.",
};

export default async function ReportPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user}>
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-5 flex items-center justify-between gap-4 border-b border-line-light pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-main sm:text-2xl">
                정류장 원터치 신고
              </h1>

              <span className="inline-flex min-h-7 items-center rounded-control border border-line bg-white px-2.5 text-xs font-semibold text-secondary">
                익명
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-muted">
              정류장을 선택하고 불편 유형을
              눌러 바로 접수해 주세요.
            </p>
          </div>

          <span className="hidden rounded-control bg-info-soft px-3 py-2 text-xs font-semibold text-info sm:inline-flex">
            GPS 위치 미저장
          </span>
        </header>

        <ReportPanel />
      </div>
    </AppShell>
  );
}
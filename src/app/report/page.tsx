import type { Metadata } from "next";

import { ReportPanel } from "@/components/report-panel";

export const metadata: Metadata = {
  title: "정류장 원터치 신고",
  description:
    "정류장 반경 500m 안에서 교통 불편을 익명으로 신고합니다.",
};

export default async function ReportPage() {
  return (
      <div className="space-y-6">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-danger-soft px-3 py-1.5 text-xs font-semibold text-danger">
              원터치 신고
            </span>

            <span className="rounded-pill bg-info-soft px-3 py-1.5 text-xs font-semibold text-info">
              위치정보 미저장
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-main sm:text-3xl">
            정류장 불편을
            <br className="sm:hidden" /> 바로
            알려주세요
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
            정류장을 검색하거나 지도에서
            선택한 후 만차 통과, 배차 지연,
            환승 실패를 한 번에 신고할 수
            있습니다.
          </p>
        </header>

        <ReportPanel />
      </div>
  );
}
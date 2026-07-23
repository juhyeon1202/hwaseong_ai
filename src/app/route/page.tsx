import type { Metadata } from "next";

import { RoutePlanner } from "@/components/route-planner";
import { Badge } from "@/components/ui";

export const metadata: Metadata = {
  title: "대체 경로 찾기",
};

export default async function RoutePage() {
  return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">
              카카오 대중교통
            </Badge>

            <Badge variant="brand">
              교통 불편 대응
            </Badge>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-main sm:text-3xl">
            대체 경로 찾기
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
            교통 불편이 발생했을 때 출발지와
            도착지를 검색하여 이용 가능한 대중교통
            경로를 확인해 보세요.
          </p>
        </header>

        <RoutePlanner />
      </div>
  );
}
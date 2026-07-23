import type {
  Metadata,
} from "next";

import {
  JournalRouteForm,
} from "@/components/journal-route-form";
import {
  requireUser,
} from "@/lib/auth";

export const metadata: Metadata = {
  title: "교통일지 작성",
  description:
    "이용한 대중교통 경로를 선택하고 구간별 만족도를 기록합니다.",
};

export default async function JournalPage() {
  await requireUser();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <JournalRouteForm />
    </div>
  );
}
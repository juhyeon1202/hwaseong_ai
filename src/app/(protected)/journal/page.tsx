import type { Metadata } from "next";

import {
  DeleteJournalButton,
  JournalForm,
  type JournalFormData,
  type JournalInitialValues,
} from "@/components/journal-form";

import {
  Badge,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "교통일지 작성",
  description:
    "이용한 대중교통 경로를 선택하고 구간별 만족도를 기록합니다.",
};

export default async function JournalPage() {
  const user = await requireUser();

}
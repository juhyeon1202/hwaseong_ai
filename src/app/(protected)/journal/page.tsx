import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";

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
  title: "교통일지",
};

type Journal = {
  id: string;
  category:
    | "commute"
    | "return"
    | "school"
    | "other";
  started_at: string;
  origin_label: string | null;
  destination_label: string | null;
  total_minutes: number | null;
  trip_segments:
    | {
        mode:
          | "walk"
          | "bus"
          | "subway"
          | "taxi"
          | "drt"
          | "other";
        route_number: string | null;
        sentiment:
          | "satisfied"
          | "dissatisfied"
          | null;
        reason_codes: string[];
        memo: string | null;
      }[]
    | null;
};

type JournalPageProps = {
  searchParams: Promise<{
    origin?: string;
    destination?: string;
    duration?: string;
    mode?: string;
  }>;
};

const categoryLabels = {
  commute: "출근",
  return: "귀가",
  school: "통학",
  other: "기타",
} as const;

const modeLabels = {
  walk: "도보",
  bus: "버스",
  subway: "지하철",
  taxi: "택시",
  drt: "똑버스",
  other: "기타",
} as const;

const allowedModes = new Set([
  "walk",
  "bus",
  "subway",
  "taxi",
  "drt",
  "other",
]);

export default async function JournalPage({
  searchParams,
}: JournalPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trip_journals")
    .select(
      `
        id,
        category,
        started_at,
        origin_label,
        destination_label,
        total_minutes,
        trip_segments (
          mode,
          route_number,
          sentiment,
          reason_codes,
          memo
        )
      `,
    )
    .eq("user_id", user.id)
    .order("started_at", {
      ascending: false,
    })
    .limit(20);

  const journals =
    (data as Journal[] | null) ?? [];

  const initialValues =
    createInitialValues(params);

  return (
    <AppShell user={user}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <section className="space-y-4">
          <SectionHeader
            title="나의 교통일지"
            description="최근 이동 경험을 확인하고 수정할 수 있습니다."
          />

          {error ? (
            <Card>
              <p className="text-sm text-danger">
                교통일지를 불러오지
                못했습니다.
              </p>
            </Card>
          ) : journals.length === 0 ? (
            <EmptyState
              title="아직 작성한 교통일지가 없습니다"
              description="첫 번째 이동 경험을 기록해 보세요."
            />
          ) : (
            <ol className="space-y-3">
              {journals.map(
                (journal) => (
                  <JournalItem
                    key={journal.id}
                    journal={journal}
                  />
                ),
              )}
            </ol>
          )}
        </section>

        <section>
          <JournalForm
            initialValues={
              initialValues
            }
          />
        </section>
      </div>
    </AppShell>
  );
}

function createInitialValues(
  params: Awaited<
    JournalPageProps["searchParams"]
  >,
): JournalInitialValues | undefined {
  const origin =
    sanitizeText(params.origin, 100);

  const destination =
    sanitizeText(
      params.destination,
      100,
    );

  const duration =
    Number(params.duration);

  const mode =
    params.mode &&
    allowedModes.has(params.mode)
      ? params.mode
      : "other";

  const hasRouteInformation =
    Boolean(origin) ||
    Boolean(destination) ||
    Number.isFinite(duration);

  if (!hasRouteInformation) {
    return undefined;
  }

  return {
    category: "other",
    originLabel: origin,
    destinationLabel: destination,
    durationMinutes:
      Number.isInteger(duration) &&
      duration >= 1 &&
      duration <= 1440
        ? duration
        : 1,
    mode,
    routeNumber: "",
    sentiment: "satisfied",
    reasonCodes: [],
    memo: "",
  };
}

function sanitizeText(
  value: string | undefined,
  maxLength: number,
) {
  return (
    value
      ?.trim()
      .slice(0, maxLength) ?? ""
  );
}

type JournalItemProps = {
  journal: Journal;
};

function JournalItem({
  journal,
}: JournalItemProps) {
  const segment =
    journal.trip_segments?.[0];

  const editData: JournalFormData = {
    id: journal.id,
    category: journal.category,
    originLabel:
      journal.origin_label ?? "",
    destinationLabel:
      journal.destination_label ?? "",
    durationMinutes:
      journal.total_minutes ?? 1,
    mode: segment?.mode ?? "other",
    routeNumber:
      segment?.route_number ?? "",
    sentiment:
      segment?.sentiment ??
      "satisfied",
    reasonCodes:
      segment?.reason_codes ?? [],
    memo: segment?.memo ?? "",
  };

  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">
            {
              categoryLabels[
                journal.category
              ]
            }
          </Badge>

          {segment && (
            <Badge variant="info">
              {modeLabels[segment.mode]}
            </Badge>
          )}

          {segment?.sentiment && (
            <Badge
              variant={
                segment.sentiment ===
                "satisfied"
                  ? "success"
                  : "warning"
              }
            >
              {segment.sentiment ===
              "satisfied"
                ? "만족"
                : "불편"}
            </Badge>
          )}

          <time className="ml-auto text-xs text-muted">
            {formatDate(
              journal.started_at,
            )}
          </time>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <strong className="min-w-0 flex-1 truncate text-sm text-main">
            {journal.origin_label ??
              "출발지"}
          </strong>

          <span className="shrink-0 text-brand-text">
            →
          </span>

          <strong className="min-w-0 flex-1 truncate text-right text-sm text-main">
            {journal.destination_label ??
              "도착지"}
          </strong>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          {journal.total_minutes !==
            null && (
            <span>
              이동{" "}
              {journal.total_minutes}분
            </span>
          )}

          {segment?.route_number && (
            <span>
              노선{" "}
              {segment.route_number}
            </span>
          )}
        </div>

        {segment?.memo && (
          <p className="mt-4 rounded-control bg-surface-muted p-3 text-sm leading-6 text-secondary">
            {segment.memo}
          </p>
        )}

        <details className="mt-5 border-t border-line-light pt-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-brand-text">
            기록 수정
          </summary>

          <div className="mt-4 border-t border-line-light pt-5">
            <JournalForm
              journal={editData}
              compact
            />

            <div className="mt-4 border-t border-line-light pt-4">
              <DeleteJournalButton
                journalId={journal.id}
              />
            </div>
          </div>
        </details>
      </Card>
    </li>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}
import type {
  Metadata,
} from "next";

import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
} from "@/components/ui";
import {
  requireUser,
} from "@/lib/auth";
import {
  createClient,
} from "@/lib/supabase/server";

import {
  JournalManageModal,
} from "@/components/journal-manage-modal";
import type {
  JournalRouteInitialData,
  Place,
  TransitRoute,
} from "@/components/journal-route-form";

export const metadata: Metadata = {
  title: "내 교통일지",
  description:
    "내가 작성한 교통일지 기록을 확인합니다.",
};

type JournalCategory =
  | "commute"
  | "return"
  | "school"
  | "other";

type SegmentMode =
  | "walk"
  | "bus"
  | "subway"
  | "taxi"
  | "drt"
  | "other";

type SegmentSentiment =
  | "satisfied"
  | "dissatisfied"
  | null;

type JournalSegment = {
  mode: SegmentMode;
  route_number: string | null;
  duration_minutes: number | null;
  sentiment: SegmentSentiment;
  reason_codes: string[];
  memo: string | null;
  segment_order: number;
};

type Journal = {
  id: string;
  category: JournalCategory;
  started_at: string;
  origin_label: string | null;
  destination_label: string | null;
  total_minutes: number | null;
  created_at: string;
  route_payload: unknown;
  trip_segments:
    | JournalSegment[]
    | null;
};

const categoryLabels: Record<
  JournalCategory,
  string
> = {
  commute: "출근",
  return: "퇴근",
  school: "등하교",
  other: "기타 이동",
};

const modeLabels: Record<
  SegmentMode,
  string
> = {
  walk: "도보",
  bus: "버스",
  subway: "지하철",
  taxi: "택시",
  drt: "똑버스",
  other: "기타",
};

export default async function MyJournalsPage() {
  const user = await requireUser();
  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("trip_journals")
      .select(
        `
          id,
          category,
          started_at,
          origin_label,
          destination_label,
          total_minutes,
          created_at,
          route_payload,
          trip_segments (
            mode,
            route_number,
            duration_minutes,
            sentiment,
            reason_codes,
            memo,
            segment_order
          )
        `,
      )
      .eq("user_id", user.id)
      .order("started_at", {
        ascending: false,
      })
      .limit(50);

  const journals =
    (data as Journal[] | null) ??
    [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex flex-col gap-4 border-b border-line-light pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-text">
            나의 기록
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-main">
            내 교통일지
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted">
            지금까지 작성한 이동 기록과
            구간별 평가를 확인할 수
            있습니다.
          </p>
        </div>

        <ButtonLink
          href="/journal"
          className="shrink-0"
        >
          새 교통일지 작성
        </ButtonLink>
      </header>

      {error ? (
        <Card className="mt-6">
          <p className="text-sm text-danger">
            교통일지 목록을 불러오지
            못했습니다.
          </p>
        </Card>
      ) : journals.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="작성한 교통일지가 없습니다"
            description="첫 번째 이동 경험을 기록해 보세요."
          />

          <div className="mx-auto mt-4 max-w-xs">
            <ButtonLink
              href="/journal"
              fullWidth
            >
              교통일지 작성하기
            </ButtonLink>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted">
              전체{" "}
              <strong className="text-main">
                {journals.length}
              </strong>
              개
            </p>
          </div>

          <ol className="mt-4 space-y-4">
            {journals.map(
              (journal) => (
                <JournalCard
                  key={journal.id}
                  journal={journal}
                />
              ),
            )}
          </ol>
        </>
      )}
    </div>
  );
}

function JournalCard({
  journal,
}: {
  journal: Journal;
}) {
  const segments = [
    ...(journal.trip_segments ??
      []),
  ].sort(
    (first, second) =>
      first.segment_order -
      second.segment_order,
  );

  const satisfiedCount =
    segments.filter(
      (segment) =>
        segment.sentiment ===
        "satisfied",
    ).length;

  const dissatisfiedCount =
    segments.filter(
      (segment) =>
        segment.sentiment ===
        "dissatisfied",
    ).length;

  const storedRoute =
    readStoredRoute(
      journal.route_payload,
    );

  const initialData: JournalRouteInitialData = {
    category: journal.category,
    originLabel:
      journal.origin_label ?? "",
    destinationLabel:
      journal.destination_label ?? "",
    startPlace:
      storedRoute.startPlace,
    endPlace:
      storedRoute.endPlace,
    selectedRoute:
      storedRoute.selectedRoute,
    reviews: segments.map(
      (segment) => ({
        sentiment:
          segment.sentiment ===
          "dissatisfied"
            ? "dissatisfied"
            : "satisfied",
        reasonCodes:
          segment.reason_codes ?? [],
        memo:
          segment.memo ?? "",
      }),
    ),
  };

  const editableJournal = {
    id: journal.id,
    category: journal.category,
    originLabel:
      journal.origin_label ?? "",
    destinationLabel:
      journal.destination_label ??
      "",
    initialData,
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

          <time className="ml-auto text-xs text-muted">
          {formatDate(
            journal.started_at,
          )}
        </time>

        <JournalManageModal
          journal={editableJournal}
        />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <strong className="min-w-0 flex-1 truncate text-base text-main">
            {journal.origin_label ||
              "출발지"}
          </strong>

          <span
            aria-hidden="true"
            className="shrink-0 text-lg font-bold text-brand-text"
          >
            →
          </span>

          <strong className="min-w-0 flex-1 truncate text-right text-base text-main">
            {journal.destination_label ||
              "도착지"}
          </strong>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
          {journal.total_minutes !==
            null && (
            <span>
              총 이동{" "}
              <strong className="text-main">
                {journal.total_minutes}분
              </strong>
            </span>
          )}

          <span>
            이동 구간{" "}
            <strong className="text-main">
              {segments.length}개
            </strong>
          </span>

          {satisfiedCount > 0 && (
            <span className="text-success">
              만족 {satisfiedCount}
            </span>
          )}

          {dissatisfiedCount >
            0 && (
            <span className="text-danger">
              불만족{" "}
              {dissatisfiedCount}
            </span>
          )}
        </div>

        {segments.length > 0 && (
          <details className="mt-5 border-t border-line-light pt-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-end text-sm font-bold text-brand-text">
              상세보기
            </summary>

            <ol className="mt-3 space-y-3">
              {segments.map(
                (segment) => (
                  <SegmentCard
                    key={
                      segment.segment_order
                    }
                    segment={segment}
                  />
                ),
              )}
            </ol>
          </details>
        )}
      </Card>
    </li>
  );
}

function SegmentCard({
  segment,
}: {
  segment: JournalSegment;
}) {
  return (
    <li className="rounded-control border border-line-light bg-surface-muted p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-main text-xs font-bold text-white">
          {segment.segment_order}
        </span>

        <strong className="text-sm text-main">
          {modeLabels[segment.mode]}
        </strong>

        {segment.route_number && (
          <span className="text-sm font-semibold text-brand-text">
            {segment.route_number}
          </span>
        )}

        {segment.duration_minutes !==
          null && (
          <span className="text-xs text-muted">
            {segment.duration_minutes}분
          </span>
        )}

        {segment.sentiment && (
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
              : "불만족"}
          </Badge>
        )}
      </div>

      {segment.reason_codes.length >
        0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {segment.reason_codes.map(
            (reason) => (
              <span
                key={reason}
                className="rounded-full border border-line bg-white px-3 py-1 text-xs text-secondary"
              >
                {formatReason(reason)}
              </span>
            ),
          )}
        </div>
      )}

      {segment.memo && (
        <p className="mt-3 text-sm leading-6 text-secondary">
          {segment.memo}
        </p>
      )}
    </li>
  );
}

function formatReason(
  reason: string,
) {
  const labels: Record<
    string,
    string
  > = {
    crowded: "혼잡",
    delayed: "배차 지연",
    transfer: "환승 불편",
    long_wait: "긴 대기시간",
    facility: "시설 불편",
  };

  return labels[reason] ?? reason;
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

function readStoredRoute(
  value: unknown,
): {
  startPlace: Place | null;
  endPlace: Place | null;
  selectedRoute: TransitRoute | null;
} {
  if (!isRecord(value)) {
    return {
      startPlace: null,
      endPlace: null,
      selectedRoute: null,
    };
  }

  const startPlace = isPlace(
    value.startPlace,
  )
    ? value.startPlace
    : null;

  const endPlace = isPlace(
    value.endPlace,
  )
    ? value.endPlace
    : null;

  const selectedRoute =
    isTransitRoute(
      value.selectedRoute,
    )
      ? value.selectedRoute
      : isTransitRoute(value)
        ? value
        : null;

  return {
    startPlace,
    endPlace,
    selectedRoute,
  };
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function isPlace(
  value: unknown,
): value is Place {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.address === "string" &&
    typeof value.longitude === "number" &&
    typeof value.latitude === "number"
  );
}

function isTransitRoute(
  value: unknown,
): value is TransitRoute {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.totalTime === "number" &&
    typeof value.totalDistance === "number" &&
    Array.isArray(value.steps)
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  revalidatePath,
} from "next/cache";

import {
  AdminWorkQueue,
} from "@/components/admin-work-queue";

import {
  AdminAiBriefing,
} from "@/components/admin-ai-briefing";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  SectionHeader,
} from "@/components/ui";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "관리자 대시보드",
};

type ReportKind =
  | "full_pass"
  | "dispatch_delay"
  | "transfer_failure";

type IncidentStatus =
  | "detected"
  | "reviewing"
  | "notified"
  | "resolved";

type StopReportSummary = {
  stop_id: number;
  stop_name: string;
  stop_number: string | null;
  district_name: string | null;
  kind: ReportKind;
  route_number: string | null;
  report_count: number;
  latest_report_at: string;
};

type Incident = {
  id: number;
  kind: ReportKind;
  route_number: string | null;
  report_count: number;
  severity:
    | "low"
    | "medium"
    | "high";
  status: IncidentStatus;
  ai_summary: string | null;
  admin_recommendation:
    | string
    | null;
  requires_review: boolean;
  created_at: string;
  transit_stops:
    | {
        name: string;
        stop_number: string | null;
        district_name: string | null;
      }
    | {
        name: string;
        stop_number: string | null;
        district_name: string | null;
      }[]
    | null;
};

const reportLabels: Record<
  ReportKind,
  string
> = {
  full_pass: "만차 통과",
  dispatch_delay: "배차 지연",
  transfer_failure: "환승 실패",
};

const statusLabels: Record<
  IncidentStatus,
  string
> = {
  detected: "감지",
  reviewing: "검토 중",
  notified: "알림 완료",
  resolved: "해결",
};

async function runIncidentDetection() {
  "use server";

  await requireAdmin();

  const supabase =
    await createClient();

  const { error } =
    await supabase.rpc(
      "detect_report_incidents",
      {
        p_threshold: 5,
        p_window_minutes: 10,
      },
    );

  if (error) {
    throw new Error(
      `사건 감지에 실패했습니다: ${error.message}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath(
    "/admin/incidents",
  );
}

export default async function AdminPage() {
  await requireAdmin();

  const supabase =
    await createClient();

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  const [
    todayReportsResult,
    activeIncidentsResult,
    reviewIncidentsResult,
    stopSummaryResult,
    incidentsResult,
  ] = await Promise.all([
    supabase
      .from("anonymous_reports")
      .select("*", {
        count: "exact",
        head: true,
      })
      .gte(
        "occurred_at",
        today.toISOString(),
      ),

    supabase
      .from("incidents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .neq(
        "status",
        "resolved",
      ),

    supabase
      .from("incidents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "requires_review",
        true,
      )
      .in("status", [
        "detected",
        "reviewing",
      ]),

    supabase
      .from("stop_report_10m")
      .select(
        `
          stop_id,
          stop_name,
          stop_number,
          district_name,
          kind,
          route_number,
          report_count,
          latest_report_at
        `,
      )
      .order("report_count", {
        ascending: false,
      })
      .limit(5),

    supabase
      .from("incidents")
      .select(
        `
          id,
          kind,
          route_number,
          report_count,
          severity,
          status,
          ai_summary,
          admin_recommendation,
          requires_review,
          created_at,
          transit_stops (
            name,
            stop_number,
            district_name
          )
        `,
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(5),
  ]);

  const todayReportCount =
    todayReportsResult.count ?? 0;

  const activeIncidentCount =
    activeIncidentsResult.count ?? 0;

  const reviewIncidentCount =
    reviewIncidentsResult.count ?? 0;

  const stopSummaries =
    (stopSummaryResult.data ??
      []) as StopReportSummary[];

  const incidents =
    (incidentsResult.data ??
      []) as Incident[];

  const hasQueryError = [
    todayReportsResult.error,
    activeIncidentsResult.error,
    reviewIncidentsResult.error,
    stopSummaryResult.error,
    incidentsResult.error,
  ].some(Boolean);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="info">
            관리자
          </Badge>

          <h1 className="mt-3 text-2xl font-bold text-main sm:text-3xl">
            교통 현황 대시보드
          </h1>

          <p className="mt-2 text-sm leading-6 text-secondary">
            시민 익명 신고와 AI 감지
            사건, 관리자 처리 업무를
            실시간으로 확인합니다.
          </p>
        </div>

        <form
          action={
            runIncidentDetection
          }
        >
          <Button
            type="submit"
            className="bg-info hover:opacity-90"
          >
            지금 사건 감지 실행
          </Button>
        </form>
      </header>

      {hasQueryError && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-soft p-4 text-sm text-danger"
        >
          일부 관리자 데이터를 불러오지
          못했습니다. Supabase 테이블과
          관리자 권한을 확인해 주세요.
        </div>
      )}

      <section
        aria-label="관리자 주요 통계"
        className="grid gap-3 sm:grid-cols-3"
      >
        <StatCard
          label="오늘 익명 신고"
          value={todayReportCount}
          unit="건"
          description="오늘 00시 이후 접수"
          variant="brand"
        />

        <StatCard
          label="현재 감지 사건"
          value={activeIncidentCount}
          unit="건"
          description="해결되지 않은 사건"
          variant="danger"
        />

        <StatCard
          label="관리자 검토 대기"
          value={reviewIncidentCount}
          unit="건"
          description="AI 생성 결과 검토 필요"
          variant="warning"
        />
      </section>

      <AdminAiBriefing />

      <AdminWorkQueue />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
        <StopReportRanking
          summaries={stopSummaries}
        />

        <IncidentList
          incidents={incidents}
        />
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  unit: string;
  description: string;
  variant:
    | "brand"
    | "danger"
    | "warning";
};

function StatCard({
  label,
  value,
  unit,
  description,
  variant,
}: StatCardProps) {
  const variants = {
    brand: {
      card:
        "border-brand-line bg-brand-softer",
      value:
        "text-brand-text",
    },
    danger: {
      card:
        "border-danger/30 bg-danger-soft",
      value: "text-danger",
    },
    warning: {
      card:
        "border-warning/30 bg-warning-soft",
      value: "text-warning",
    },
  };

  return (
    <Card
      className={
        variants[variant].card
      }
    >
      <p className="text-sm font-medium text-secondary">
        {label}
      </p>

      <p
        className={[
          "mt-3 text-3xl font-bold",
          variants[variant].value,
        ].join(" ")}
      >
        {value.toLocaleString()}

        <span className="ml-1 text-base">
          {unit}
        </span>
      </p>

      <p className="mt-2 text-xs text-muted">
        {description}
      </p>
    </Card>
  );
}

function StopReportRanking({
  summaries,
}: {
  summaries: StopReportSummary[];
}) {
  const maximumCount = Math.max(
    ...summaries.map(
      (summary) =>
        summary.report_count,
    ),
    1,
  );

  return (
    <Card>
      <SectionHeader
        title="최근 10분 신고 집중 정류장"
        description="정류장·불편 유형별 실시간 집계"
        action={
          <Badge variant="info">
            실시간
          </Badge>
        }
      />

      {summaries.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="최근 신고가 없습니다"
            description="최근 10분간 접수된 익명 신고가 없습니다."
          />
        </div>
      ) : (
        <ol className="mt-5 space-y-5">
          {summaries.map(
            (
              summary,
              index,
            ) => {
              const progress =
                (summary.report_count /
                  maximumCount) *
                100;

              return (
                <li
                  key={[
                    summary.stop_id,
                    summary.kind,
                    summary.route_number,
                  ].join("-")}
                  className="grid grid-cols-[32px_1fr_48px] items-center gap-3"
                >
                  <span
                    className={[
                      "flex size-8 items-center justify-center rounded-pill text-xs font-bold",
                      index === 0
                        ? "bg-brand text-on-brand"
                        : "bg-surface-muted text-secondary",
                    ].join(" ")}
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0">
                    <div className="mb-2">
                      <p className="truncate text-sm font-semibold text-main">
                        {
                          summary.stop_name
                        }
                      </p>

                      <p className="mt-1 truncate text-xs text-muted">
                        {summary.stop_number ??
                          "정류장 번호 없음"}
                        {" · "}
                        {
                          reportLabels[
                            summary.kind
                          ]
                        }
                        {summary.route_number
                          ? ` · ${summary.route_number}번`
                          : ""}
                      </p>
                    </div>

                    <ProgressBar
                      value={progress}
                      variant={
                        summary.kind ===
                        "full_pass"
                          ? "danger"
                          : "brand"
                      }
                    />
                  </div>

                  <strong className="text-right text-sm text-main">
                    {
                      summary.report_count
                    }
                    건
                  </strong>
                </li>
              );
            },
          )}
        </ol>
      )}
    </Card>
  );
}

function IncidentList({
  incidents,
}: {
  incidents: Incident[];
}) {
  return (
    <Card>
      <SectionHeader
        title="최근 AI 감지 사건"
        description="검토가 필요한 교통 상황"
        action={
          <Link
            href="/admin/incidents"
            className="text-xs font-semibold text-info"
          >
            전체 보기
          </Link>
        }
      />

      {incidents.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="감지된 사건이 없습니다"
            description="신고 임계치를 넘으면 AI 사건이 생성됩니다."
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {incidents.map(
            (incident) => {
              const stop =
                Array.isArray(
                  incident.transit_stops,
                )
                  ? incident
                      .transit_stops[0]
                  : incident.transit_stops;

              return (
                <li
                  key={incident.id}
                >
                  <Link
                    href={`/admin/incidents/${incident.id}`}
                    className="block rounded-card border border-line p-4 transition-colors hover:bg-surface-muted"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-main">
                          {stop?.name ??
                            "정류장 정보 없음"}
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          {
                            reportLabels[
                              incident.kind
                            ]
                          }

                          {incident.route_number
                            ? ` · ${incident.route_number}번`
                            : ""}

                          {" · "}

                          {
                            incident.report_count
                          }
                          건
                        </p>
                      </div>

                      <IncidentBadge
                        status={
                          incident.status
                        }
                        requiresReview={
                          incident.requires_review
                        }
                      />
                    </div>

                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-secondary">
                      {incident.ai_summary ??
                        incident.admin_recommendation ??
                        "AI 분석 결과를 기다리고 있습니다."}
                    </p>

                    <p className="mt-3 text-[11px] text-muted">
                      {formatDateTime(
                        incident.created_at,
                      )}
                    </p>
                  </Link>
                </li>
              );
            },
          )}
        </ul>
      )}
    </Card>
  );
}

function IncidentBadge({
  status,
  requiresReview,
}: {
  status: IncidentStatus;
  requiresReview: boolean;
}) {
  if (requiresReview) {
    return (
      <Badge variant="warning">
        검토 필요
      </Badge>
    );
  }

  if (status === "resolved") {
    return (
      <Badge variant="success">
        해결
      </Badge>
    );
  }

  if (status === "notified") {
    return (
      <Badge variant="info">
        알림 완료
      </Badge>
    );
  }

  return (
    <Badge variant="brand">
      {statusLabels[status]}
    </Badge>
  );
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}
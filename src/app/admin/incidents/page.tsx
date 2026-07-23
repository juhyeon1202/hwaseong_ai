import type {
  Metadata,
} from "next";
import Link from "next/link";

import {
  Badge,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import {
  requireAdmin,
} from "@/lib/auth";
import {
  createClient,
} from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "관리자 교통 사건",
};

type IncidentStatus =
  | "detected"
  | "reviewing"
  | "notified"
  | "resolved";

type Incident = {
  id: number;

  kind:
    | "full_pass"
    | "dispatch_delay"
    | "transfer_failure";

  route_number:
    | string
    | null;

  report_count: number;

  severity:
    | "low"
    | "medium"
    | "high";

  status:
    IncidentStatus;

  ai_summary:
    | string
    | null;

  admin_recommendation:
    | string
    | null;

  requires_review: boolean;
  window_started_at: string;
  window_ended_at: string;
  created_at: string;
  updated_at: string;

  transit_stops:
    | {
        name: string;
        stop_number:
          | string
          | null;
        district_name:
          | string
          | null;
      }
    | {
        name: string;
        stop_number:
          | string
          | null;
        district_name:
          | string
          | null;
      }[]
    | null;
};

const reportLabels = {
  full_pass:
    "만차 통과",
  dispatch_delay:
    "배차 지연",
  transfer_failure:
    "환승 실패",
} as const;

export default async function AdminIncidentsPage() {
  await requireAdmin();

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
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
        window_started_at,
        window_ended_at,
        created_at,
        updated_at,
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
    .limit(100);

  const incidents =
    (data ?? []) as Incident[];

  const detectedCount =
    incidents.filter(
      (incident) =>
        incident.status ===
        "detected",
    ).length;

  const reviewingCount =
    incidents.filter(
      (incident) =>
        incident.status ===
        "reviewing",
    ).length;

  const notifiedCount =
    incidents.filter(
      (incident) =>
        incident.status ===
        "notified",
    ).length;

  const resolvedCount =
    incidents.filter(
      (incident) =>
        incident.status ===
        "resolved",
    ).length;

  return (
    <div className="space-y-7">
      <header>
        <Badge variant="danger">
          실시간 교통
        </Badge>

        <h1 className="mt-3 text-2xl font-bold text-main sm:text-3xl">
          교통 사건 관리
        </h1>

        <p className="mt-2 text-sm leading-6 text-secondary">
          시민 익명 신고를 기반으로
          감지된 교통 사건을 확인하고
          AI 분석과 관리자 검토를
          진행합니다.
        </p>
      </header>

      <section
        aria-label="교통 사건 현황"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatusSummary
          label="분석 대기"
          value={
            detectedCount
          }
          variant="brand"
        />

        <StatusSummary
          label="관리자 검토"
          value={
            reviewingCount
          }
          variant="warning"
        />

        <StatusSummary
          label="시민 안내"
          value={
            notifiedCount
          }
          variant="info"
        />

        <StatusSummary
          label="해결 완료"
          value={
            resolvedCount
          }
          variant="success"
        />
      </section>

      <Card>
        <SectionHeader
          title="감지된 교통 사건"
          description="최근 생성된 사건부터 표시됩니다."
          action={
            <Badge variant="info">
              {incidents.length}
              건
            </Badge>
          }
        />

        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-control border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
          >
            교통 사건 목록을
            불러오지 못했습니다.
            Supabase 권한과 incidents
            테이블을 확인해 주세요.
          </div>
        ) : incidents.length ===
          0 ? (
          <div className="mt-5">
            <EmptyState
              title="감지된 교통 사건이 없습니다."
              description="동일 정류장과 신고 유형으로 신고가 기준 이상 접수되면 사건이 생성됩니다."
            />
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {incidents.map(
              (incident) => (
                <IncidentItem
                  key={
                    incident.id
                  }
                  incident={
                    incident
                  }
                />
              ),
            )}
          </ul>
        )}
      </Card>

      <p className="text-center text-xs leading-5 text-muted">
        사건은 시민 안내가 승인되기
        전에도 관리자 목록에
        표시됩니다. 시민에게 공개되는
        알림은 관리자 승인 후 별도로
        생성됩니다.
      </p>
    </div>
  );
}

function IncidentItem({
  incident,
}: {
  incident: Incident;
}) {
  const stop =
    Array.isArray(
      incident.transit_stops,
    )
      ? incident
          .transit_stops[0]
      : incident.transit_stops;

  return (
    <li>
      <Link
        href={`/admin/incidents/${incident.id}`}
        className="block rounded-card border border-line p-5 transition-colors hover:border-brand-line hover:bg-surface-muted"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge
                severity={
                  incident.severity
                }
              />

              <StatusBadge
                status={
                  incident.status
                }
              />

              {incident.requires_review && (
                <Badge variant="warning">
                  관리자 검토 필요
                </Badge>
              )}
            </div>

            <h2 className="mt-3 truncate text-lg font-bold text-main">
              {stop?.name ??
                "정류장 정보 없음"}
            </h2>

            <p className="mt-1 text-sm text-secondary">
              {stop?.stop_number ??
                "정류장 번호 없음"}

              {stop?.district_name
                ? ` · ${stop.district_name}`
                : ""}
            </p>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <p className="text-xs text-muted">
              사건 번호
            </p>

            <p className="mt-1 font-bold text-main">
              #{incident.id}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-control bg-surface-muted p-4 sm:grid-cols-3">
          <IncidentInfo
            label="신고 유형"
            value={
              reportLabels[
                incident.kind
              ]
            }
          />

          <IncidentInfo
            label="노선"
            value={
              incident.route_number ??
              "노선 미지정"
            }
          />

          <IncidentInfo
            label="신고 건수"
            value={`${incident.report_count}건`}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted">
              AI 분석 결과
            </p>

            <p className="mt-1 line-clamp-2 text-sm leading-6 text-secondary">
              {incident.ai_summary ??
                incident.admin_recommendation ??
                "아직 AI 분석을 실행하지 않았습니다."}
            </p>
          </div>

          <div className="shrink-0 text-sm font-semibold text-brand-text">
            사건 상세보기 →
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">
          최근 신고{" "}
          {formatDateTime(
            incident.window_ended_at,
          )}
        </p>
      </Link>
    </li>
  );
}

function StatusSummary({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant:
    | "brand"
    | "warning"
    | "info"
    | "success";
}) {
  const colors = {
    brand:
      "border-brand-line bg-brand-softer text-brand-text",
    warning:
      "border-warning/30 bg-warning-soft text-warning",
    info:
      "border-info/30 bg-info-soft text-info",
    success:
      "border-success/30 bg-success-soft text-success",
  };

  return (
    <div
      className={[
        "rounded-card border p-5",
        colors[variant],
      ].join(" ")}
    >
      <p className="text-sm font-semibold">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value.toLocaleString()}

        <span className="ml-1 text-sm">
          건
        </span>
      </p>
    </div>
  );
}

function IncidentInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-main">
        {value}
      </p>
    </div>
  );
}

function SeverityBadge({
  severity,
}: {
  severity:
    | "low"
    | "medium"
    | "high";
}) {
  if (
    severity === "high"
  ) {
    return (
      <Badge variant="danger">
        긴급
      </Badge>
    );
  }

  if (
    severity === "medium"
  ) {
    return (
      <Badge variant="warning">
        주의
      </Badge>
    );
  }

  return (
    <Badge variant="info">
      일반
    </Badge>
  );
}

function StatusBadge({
  status,
}: {
  status:
    IncidentStatus;
}) {
  if (
    status === "resolved"
  ) {
    return (
      <Badge variant="success">
        해결 완료
      </Badge>
    );
  }

  if (
    status === "notified"
  ) {
    return (
      <Badge variant="info">
        시민 안내
      </Badge>
    );
  }

  if (
    status === "reviewing"
  ) {
    return (
      <Badge variant="warning">
        검토 중
      </Badge>
    );
  }

  return (
    <Badge variant="brand">
      감지됨
    </Badge>
  );
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}
import type {
  Metadata,
} from "next";
import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import {
  AdminIncidentAiPanel,
} from "@/components/admin-incident-ai-panel";
import {
  Badge,
  Card,
  SectionHeader,
} from "@/components/ui";
import {
  requireAdmin,
} from "@/lib/auth";
import {
  createClient,
} from "@/lib/supabase/server";

import {
  AdminDrtReviewPanel,
} from "@/components/admin-drt-review-panel";

type IncidentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Incident = {
  id: number;
  stop_id: number;

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
    | "detected"
    | "reviewing"
    | "notified"
    | "resolved";

  ai_summary:
    | string
    | null;

  citizen_guidance:
    | string
    | null;

  admin_recommendation:
    | string
    | null;

  evidence:
    | Record<string, unknown>
    | null;

  model_name:
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

const statusLabels = {
  detected:
    "감지됨",
  reviewing:
    "검토 중",
  notified:
    "시민 안내",
  resolved:
    "해결 완료",
} as const;

export async function generateMetadata({
  params,
}: IncidentPageProps): Promise<Metadata> {
  const { id } =
    await params;

  return {
    title:
      `관리자 교통 사건 #${id}`,
  };
}

export default async function AdminIncidentPage({
  params,
}: IncidentPageProps) {
  await requireAdmin();

  const { id } =
    await params;

  const incidentId =
    Number(id);

  if (
    !Number.isInteger(
      incidentId,
    ) ||
    incidentId < 1
  ) {
    notFound();
  }

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
        stop_id,
        kind,
        route_number,
        report_count,
        severity,
        status,
        ai_summary,
        citizen_guidance,
        admin_recommendation,
        evidence,
        model_name,
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
    .eq("id", incidentId)
    .single();

  if (
    error ||
    !data
  ) {
    notFound();
  }

  const incident =
    data as Incident;

  const stop =
    Array.isArray(
      incident.transit_stops,
    )
      ? incident
          .transit_stops[0]
      : incident.transit_stops;

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/incidents"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-text"
        >
          ← 교통 사건 목록
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2">
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

        <h1 className="mt-4 text-2xl font-bold text-main sm:text-3xl">
          {stop?.name ??
            "정류장 정보 없음"}
        </h1>

        <p className="mt-2 text-sm text-secondary">
          {reportLabels[
            incident.kind
          ]}

          {incident.route_number
            ? ` · ${incident.route_number}번`
            : ""}

          {" · "}

          신고{" "}
          {incident.report_count}
          건
        </p>
      </header>

      <section
        aria-label="사건 핵심 정보"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <InfoCard
          label="정류장"
          value={
            stop?.stop_number
              ? `${stop.name} (${stop.stop_number})`
              : stop?.name ??
                "정보 없음"
          }
        />

        <InfoCard
          label="행정구역"
          value={
            stop?.district_name ??
            "정보 없음"
          }
        />

        <InfoCard
          label="감지 시작"
          value={formatDateTime(
            incident.window_started_at,
          )}
        />

        <InfoCard
          label="최근 신고"
          value={formatDateTime(
            incident.window_ended_at,
          )}
        />
      </section>

      <AdminIncidentAiPanel
        incidentId={
          incident.id
        }
        status={
          incident.status
        }
        requiresReview={
          incident.requires_review
        }
        aiSummary={
          incident.ai_summary
        }
        citizenGuidance={
          incident.citizen_guidance
        }
        adminRecommendation={
          incident.admin_recommendation
        }
        modelName={
          incident.model_name
        }
        evidence={
          incident.evidence
        }
      />

      <AdminDrtReviewPanel
        incidentId={
          incident.id
        }
      />

      <Card>
        <SectionHeader
          title="관리 기록"
          description="사건의 현재 처리 상태와 시스템 정보를 확인합니다."
        />

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <InfoItem
            label="사건 번호"
            value={`#${incident.id}`}
          />

          <InfoItem
            label="현재 상태"
            value={
              statusLabels[
                incident.status
              ]
            }
          />

          <InfoItem
            label="최초 생성"
            value={formatDateTime(
              incident.created_at,
            )}
          />

          <InfoItem
            label="최근 수정"
            value={formatDateTime(
              incident.updated_at,
            )}
          />
        </dl>
      </Card>

      <p className="text-center text-xs leading-5 text-muted">
        AI 분석은 관리자 판단을
        지원하기 위한 참고 자료입니다.
        실제 시민 알림과 똑버스 호출은
        관리자 검토 후 처리해야 합니다.
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Card>
      <p className="text-xs font-medium text-muted">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-main">
        {value}
      </p>
    </Card>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-control bg-surface-muted p-4">
      <dt className="text-xs text-muted">
        {label}
      </dt>

      <dd className="mt-1 text-sm font-semibold text-main">
        {value}
      </dd>
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
  if (severity === "high") {
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
    | "detected"
    | "reviewing"
    | "notified"
    | "resolved";
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
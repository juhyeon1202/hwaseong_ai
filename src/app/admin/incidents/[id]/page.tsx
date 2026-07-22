import type { Metadata } from "next";
import Link from "next/link";
import {
  notFound,
} from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  Badge,
  Button,
  Card,
  SectionHeader,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type IncidentStatus =
  | "detected"
  | "reviewing"
  | "notified"
  | "resolved";

type ReportKind =
  | "full_pass"
  | "dispatch_delay"
  | "transfer_failure";

type IncidentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Incident = {
  id: number;
  stop_id: number;
  kind: ReportKind;
  route_number: string | null;
  window_started_at: string;
  window_ended_at: string;
  report_count: number;
  severity: "low" | "medium" | "high";
  status: IncidentStatus;
  ai_summary: string | null;
  citizen_guidance: string | null;
  admin_recommendation: string | null;
  evidence: Record<
    string,
    string | number | boolean | null
  >;
  model_name: string | null;
  requires_review: boolean;
  created_at: string;
  updated_at: string;

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

export async function generateMetadata({
  params,
}: IncidentPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `교통 사건 #${id}`,
  };
}

async function updateIncidentStatus(
  formData: FormData,
) {
  "use server";

  await requireAdmin();

  const incidentId = Number(
    formData.get("incidentId"),
  );

  const requestedStatus = String(
    formData.get("status"),
  ) as IncidentStatus;

  const allowedStatuses: IncidentStatus[] = [
    "reviewing",
    "notified",
    "resolved",
  ];

  if (
    !Number.isInteger(incidentId) ||
    incidentId < 1
  ) {
    throw new Error(
      "올바르지 않은 사건 번호입니다.",
    );
  }

  if (
    !allowedStatuses.includes(
      requestedStatus,
    )
  ) {
    throw new Error(
      "올바르지 않은 사건 상태입니다.",
    );
  }

  const supabase = await createClient();

  const { data: incident, error: loadError } =
    await supabase
      .from("incidents")
      .select(
        `
          id,
          ai_summary,
          citizen_guidance
        `,
      )
      .eq("id", incidentId)
      .single();

  if (loadError || !incident) {
    throw new Error(
      "사건 정보를 찾을 수 없습니다.",
    );
  }

  const { error: updateError } =
    await supabase
      .from("incidents")
      .update({
        status: requestedStatus,
        requires_review:
          requestedStatus === "reviewing",
      })
      .eq("id", incidentId);

  if (updateError) {
    throw new Error(
      `사건 상태를 변경하지 못했습니다: ${updateError.message}`,
    );
  }

  /*
   * 알림 완료 처리 시 시민용 알림을 생성합니다.
   * 동일 사건의 시민 알림이 이미 있으면 중복 생성하지 않습니다.
   */
  if (requestedStatus === "notified") {
    const { data: existingAlert } =
      await supabase
        .from("alerts")
        .select("id")
        .eq("incident_id", incidentId)
        .eq("audience", "citizen")
        .maybeSingle();

    if (!existingAlert) {
      const { error: alertError } =
        await supabase
          .from("alerts")
          .insert({
            incident_id: incidentId,
            audience: "citizen",
            title: "교통 혼잡 안내",
            body:
              incident.citizen_guidance ??
              incident.ai_summary ??
              "주변 교통 상황을 확인해 주세요.",
            action_url:
              `/incidents/${incidentId}`,
            is_simulated: true,
            sent_at:
              new Date().toISOString(),
          });

      if (alertError) {
        throw new Error(
          `시민 알림을 생성하지 못했습니다: ${alertError.message}`,
        );
      }
    }
  }

  revalidatePath("/admin");
  revalidatePath(
    `/admin/incidents/${incidentId}`,
  );
}

export default async function IncidentDetailPage({
  params,
}: IncidentPageProps) {
  const { id } = await params;
  const incidentId = Number(id);

  if (
    !Number.isInteger(incidentId) ||
    incidentId < 1
  ) {
    notFound();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("incidents")
    .select(
      `
        id,
        stop_id,
        kind,
        route_number,
        window_started_at,
        window_ended_at,
        report_count,
        severity,
        status,
        ai_summary,
        citizen_guidance,
        admin_recommendation,
        evidence,
        model_name,
        requires_review,
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

  if (error || !data) {
    notFound();
  }

  const incident = data as Incident;

  const stop = Array.isArray(
    incident.transit_stops,
  )
    ? incident.transit_stops[0]
    : incident.transit_stops;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-text"
        >
          ← 관리자 대시보드
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={incident.status}
              />

              <SeverityBadge
                severity={incident.severity}
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
              사건 #{incident.id}
              {" · "}
              {reportLabels[incident.kind]}
              {incident.route_number
                ? ` · ${incident.route_number}번`
                : ""}
            </p>
          </div>

          <p className="text-xs text-muted">
            생성{" "}
            {formatDateTime(
              incident.created_at,
            )}
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="신고 건수"
          value={`${incident.report_count}건`}
        />

        <SummaryCard
          label="감지 구간"
          value={formatTimeRange(
            incident.window_started_at,
            incident.window_ended_at,
          )}
        />

        <SummaryCard
          label="분석 방식"
          value={
            incident.model_name ??
            "규칙 기반"
          }
        />
      </section>

      <Card>
        <SectionHeader
          title="감지 근거"
          description="사건 생성에 사용된 신고 데이터"
        />

        <dl className="mt-5 grid gap-4 rounded-card bg-surface-muted p-4 sm:grid-cols-2">
          <EvidenceItem
            label="정류장"
            value={
              stop?.stop_number
                ? `${stop.name} (${stop.stop_number})`
                : stop?.name ??
                  "정보 없음"
            }
          />

          <EvidenceItem
            label="행정동"
            value={
              stop?.district_name ??
              "정보 없음"
            }
          />

          <EvidenceItem
            label="불편 유형"
            value={
              reportLabels[incident.kind]
            }
          />

          <EvidenceItem
            label="노선"
            value={
              incident.route_number
                ? `${incident.route_number}번`
                : "노선 미입력"
            }
          />
        </dl>
      </Card>

      <Card>
        <SectionHeader
          title="AI 상황 요약"
          description="익명 신고 집계 기반 분석"
          action={
            <Badge variant="info">
              {
                incident.model_name ??
                "규칙 기반"
              }
            </Badge>
          }
        />

        <p className="mt-5 rounded-card bg-info-soft p-4 text-sm leading-7 text-main">
          {incident.ai_summary ??
            "아직 분석 결과가 없습니다."}
        </p>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <SectionHeader
            title="시민 안내문"
            description="시민 화면에 표시할 내용"
          />

          <p className="mt-5 text-sm leading-7 text-secondary">
            {incident.citizen_guidance ??
              "시민 안내문이 생성되지 않았습니다."}
          </p>
        </Card>

        <Card>
          <SectionHeader
            title="관리자 권고"
            description="행정 대응 검토 내용"
          />

          <p className="mt-5 text-sm leading-7 text-secondary">
            {incident.admin_recommendation ??
              "관리자 권고가 생성되지 않았습니다."}
          </p>
        </Card>
      </div>

      <Card>
        <SectionHeader
          title="사건 처리"
          description="상태 변경 전 근거와 안내문을 확인하세요."
        />

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {incident.status ===
            "detected" && (
            <StatusForm
              incidentId={incident.id}
              status="reviewing"
              label="검토 시작"
              variant="secondary"
            />
          )}

          {incident.status !==
            "notified" &&
            incident.status !==
              "resolved" && (
              <StatusForm
                incidentId={incident.id}
                status="notified"
                label="시민 알림 완료"
                variant="primary"
              />
            )}

          {incident.status !==
            "resolved" && (
            <StatusForm
              incidentId={incident.id}
              status="resolved"
              label="사건 해결 처리"
              variant="secondary"
            />
          )}

          {incident.status ===
            "resolved" && (
            <Badge variant="success">
              해결된 사건입니다
            </Badge>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-muted">
          현재 시민 알림은 프로토타입 DB에만
          기록되며 실제 문자나 카카오톡 메시지를
          발송하지 않습니다.
        </p>
      </Card>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({
  label,
  value,
}: SummaryCardProps) {
  return (
    <Card>
      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-2 font-bold text-main">
        {value}
      </p>
    </Card>
  );
}

type EvidenceItemProps = {
  label: string;
  value: string;
};

function EvidenceItem({
  label,
  value,
}: EvidenceItemProps) {
  return (
    <div>
      <dt className="text-xs text-muted">
        {label}
      </dt>

      <dd className="mt-1 text-sm font-semibold text-main">
        {value}
      </dd>
    </div>
  );
}

type StatusFormProps = {
  incidentId: number;
  status: IncidentStatus;
  label: string;
  variant:
    | "primary"
    | "secondary";
};

function StatusForm({
  incidentId,
  status,
  label,
  variant,
}: StatusFormProps) {
  return (
    <form action={updateIncidentStatus}>
      <input
        type="hidden"
        name="incidentId"
        value={incidentId}
      />

      <input
        type="hidden"
        name="status"
        value={status}
      />

      <Button
        type="submit"
        variant={variant}
        fullWidth
      >
        {label}
      </Button>
    </form>
  );
}

type StatusBadgeProps = {
  status: IncidentStatus;
};

function StatusBadge({
  status,
}: StatusBadgeProps) {
  const variants: Record<
    IncidentStatus,
    "brand" | "warning" | "info" | "success"
  > = {
    detected: "brand",
    reviewing: "warning",
    notified: "info",
    resolved: "success",
  };

  return (
    <Badge variant={variants[status]}>
      {statusLabels[status]}
    </Badge>
  );
}

type SeverityBadgeProps = {
  severity: Incident["severity"];
};

function SeverityBadge({
  severity,
}: SeverityBadgeProps) {
  if (severity === "high") {
    return (
      <Badge variant="danger">
        긴급
      </Badge>
    );
  }

  if (severity === "medium") {
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

function formatTimeRange(
  start: string,
  end: string,
) {
  const formatter =
    new Intl.DateTimeFormat(
      "ko-KR",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );

  return `${formatter.format(
    new Date(start),
  )} ~ ${formatter.format(
    new Date(end),
  )}`;
}
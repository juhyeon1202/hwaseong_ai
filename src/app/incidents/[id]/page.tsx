import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Badge,
  ButtonLink,
  Card,
  SectionHeader,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

type IncidentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Incident = {
  id: number;
  kind:
    | "full_pass"
    | "dispatch_delay"
    | "transfer_failure";
  route_number: string | null;
  report_count: number;
  severity:
    | "low"
    | "medium"
    | "high";
  status:
    | "notified"
    | "resolved";
  citizen_guidance: string | null;
  ai_summary: string | null;
  evidence: unknown;
  window_started_at: string;
  window_ended_at: string;
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

const reportLabels = {
  full_pass: "만차 통과",
  dispatch_delay: "배차 지연",
  transfer_failure: "환승 실패",
} as const;

function readNearbyContext(
  evidence: unknown,
): string | null {
  if (
    !evidence ||
    typeof evidence !== "object" ||
    !("aiAnalysis" in evidence)
  ) {
    return null;
  }

  const aiAnalysis = (
    evidence as {
      aiAnalysis?: unknown;
    }
  ).aiAnalysis;

  if (
    !aiAnalysis ||
    typeof aiAnalysis !== "object" ||
    !("nearbyContext" in aiAnalysis)
  ) {
    return null;
  }

  const nearbyContext = (
    aiAnalysis as {
      nearbyContext?: unknown;
    }
  ).nearbyContext;

  return typeof nearbyContext === "string" &&
    nearbyContext.trim()
    ? nearbyContext.trim()
    : null;
}

export async function generateMetadata({
  params,
}: IncidentPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `교통 상황 #${id}`,
  };
}

export default async function IncidentPage({
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
        kind,
        route_number,
        report_count,
        severity,
        status,
        citizen_guidance,
        ai_summary,
        evidence,
        window_started_at,
        window_ended_at,
        transit_stops (
          name,
          stop_number,
          district_name
        )
      `,
    )
    .eq("id", incidentId)
    .in("status", [
      "notified",
      "resolved",
    ])
    .single();

  if (error || !data) {
    notFound();
  }

  const incident = data as Incident;
  const nearbyContext = readNearbyContext(
    incident.evidence,
  );

  const stop = Array.isArray(
    incident.transit_stops,
  )
    ? incident.transit_stops[0]
    : incident.transit_stops;

  return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header>
          <Link
            href="/incidents"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-text"
          >
            ← 교통 알림 목록
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SeverityBadge
              severity={incident.severity}
            />

            {incident.status ===
            "resolved" ? (
              <Badge variant="success">
                해결
              </Badge>
            ) : (
              <Badge variant="info">
                안내 중
              </Badge>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-bold text-main sm:text-3xl">
            {stop?.name ??
              "정류장 정보 없음"}
          </h1>

          <p className="mt-2 text-sm text-secondary">
            {reportLabels[incident.kind]}

            {incident.route_number
              ? ` · ${incident.route_number}번`
              : ""}

            {` · 신고 ${incident.report_count}건`}
          </p>
        </header>

        <Card className="border-brand-line bg-brand-softer">
          <SectionHeader
            title="종합 교통 상황 안내"
            description="AI 분석과 확인된 주변 정보를 함께 안내합니다."
          />

          <div className="mt-5 grid gap-4">
            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="text-sm font-bold text-main">
                사건 요약
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-secondary">
                {incident.ai_summary ??
                  `${stop?.name ?? "해당 정류장"}에서 ${reportLabels[incident.kind]} 신고 ${incident.report_count}건이 접수되었습니다.`}
              </p>
            </section>

            <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
              <h2 className="text-sm font-bold text-main">
                주변 실시간 교통·기상 정보
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-secondary">
                {nearbyContext ??
                  "현재 확인된 외부 교통·기상 특이사항이 없습니다. 실제 운행 정보는 교통정보 제공처에서 다시 확인해 주세요."}
              </p>
            </section>

            <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
              <h2 className="text-sm font-bold text-main">
                시민 행동 안내
              </h2>
              <p className="mt-2 whitespace-pre-line text-base font-semibold leading-7 text-main">
                {incident.citizen_guidance ??
                  "실시간 도착 정보를 확인하고 이동에 여유를 두어 주세요."}
              </p>
            </section>
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="감지 정보"
            description="익명 신고 집계 결과"
          />

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem
              label="정류장"
              value={
                stop?.stop_number
                  ? `${stop.name} (${stop.stop_number})`
                  : stop?.name ??
                    "정보 없음"
              }
            />

            <InfoItem
              label="행정동"
              value={
                stop?.district_name ??
                "정보 없음"
              }
            />

            <InfoItem
              label="불편 유형"
              value={
                reportLabels[
                  incident.kind
                ]
              }
            />

            <InfoItem
              label="신고 건수"
              value={`${incident.report_count}건`}
            />

            <InfoItem
              label="감지 시작"
              value={formatDateTime(
                incident.window_started_at,
              )}
            />

            <InfoItem
              label="최근 신고"
              value={formatDateTime(
                incident.window_ended_at,
              )}
            />
          </dl>
        </Card>

        <Card>
          <SectionHeader
            title="이동 안내"
            description="다른 경로와 주변 정류장을 확인하세요."
          />

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <ButtonLink
              href="/route"
              fullWidth
            >
              대체 경로 찾기
            </ButtonLink>

            <ButtonLink
              href="/report"
              variant="secondary"
              fullWidth
            >
              추가 불편 신고
            </ButtonLink>
          </div>
        </Card>

        <p className="text-center text-xs leading-5 text-muted">
          이 정보는 시민 익명 신고를 바탕으로
          제공되며 실제 운행 정보와 차이가 있을 수
          있습니다.
        </p>
      </div>
  );
}

type InfoItemProps = {
  label: string;
  value: string;
};

function InfoItem({
  label,
  value,
}: InfoItemProps) {
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

type SeverityBadgeProps = {
  severity:
    | "low"
    | "medium"
    | "high";
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
      안내
    </Badge>
  );
}

function formatDateTime(value: string) {
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

import type { Metadata } from "next";
import Link from "next/link";

import {
  Badge,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "실시간 교통 알림",
};

type IncidentStatus =
  | "notified"
  | "resolved";

type IncidentSeverity =
  | "low"
  | "medium"
  | "high";

type ReportKind =
  | "full_pass"
  | "dispatch_delay"
  | "transfer_failure";

type Incident = {
  id: number;
  kind: ReportKind;
  route_number: string | null;
  report_count: number;
  severity: IncidentSeverity;
  status: IncidentStatus;
  citizen_guidance: string | null;
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

export default async function IncidentsPage() {
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
        created_at,
        transit_stops (
          name,
          stop_number,
          district_name
        )
      `,
    )
    .in("status", [
      "notified",
      "resolved",
    ])
    .order("created_at", {
      ascending: false,
    })
    .limit(30);

  const incidents =
    (data as Incident[] | null) ?? [];

  return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <SectionHeader
          title="실시간 교통 알림"
          description="시민 신고를 바탕으로 확인된 교통 상황입니다."
        />

        {error ? (
          <Card>
            <p className="text-sm text-danger">
              교통 알림을 불러오지 못했습니다.
              잠시 후 다시 시도해 주세요.
            </p>
          </Card>
        ) : incidents.length === 0 ? (
          <EmptyState
            title="현재 등록된 교통 알림이 없습니다"
            description="새로운 교통 상황이 확인되면 이곳에 표시됩니다."
          />
        ) : (
          <ul className="space-y-3">
            {incidents.map((incident) => (
              <IncidentItem
                key={incident.id}
                incident={incident}
              />
            ))}
          </ul>
        )}
      </div>
  );
}

type IncidentItemProps = {
  incident: Incident;
};

function IncidentItem({
  incident,
}: IncidentItemProps) {
  const stop = Array.isArray(
    incident.transit_stops,
  )
    ? incident.transit_stops[0]
    : incident.transit_stops;

  return (
    <li>
      <Link
        href={`/incidents/${incident.id}`}
        className="block rounded-card border border-line bg-surface p-5 shadow-card transition-transform active:scale-[0.99] md:hover:-translate-y-0.5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge
            severity={incident.severity}
          />

          {incident.status === "resolved" ? (
            <Badge variant="success">
              해결
            </Badge>
          ) : (
            <Badge variant="info">
              안내 중
            </Badge>
          )}

          <span className="ml-auto text-xs text-muted">
            {formatDateTime(
              incident.created_at,
            )}
          </span>
        </div>

        <h2 className="mt-4 text-lg font-bold text-main">
          {stop?.name ??
            "정류장 정보 없음"}
        </h2>

        <p className="mt-1 text-sm text-secondary">
          {reportLabels[incident.kind]}

          {incident.route_number
            ? ` · ${incident.route_number}번`
            : ""}

          {` · 신고 ${incident.report_count}건`}
        </p>

        <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">
          {incident.citizen_guidance ??
            "주변 교통 상황을 확인해 주세요."}
        </p>

        <span className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-text">
          상세 안내 확인 →
        </span>
      </Link>
    </li>
  );
}

type SeverityBadgeProps = {
  severity: IncidentSeverity;
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
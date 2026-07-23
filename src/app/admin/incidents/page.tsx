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
  title: "교통 상황 알림",
};

type CitizenAlert = {
  id: number;
  incident_id: number;
  title: string;
  body: string;
  action_url: string | null;
  is_simulated: boolean;
  sent_at: string | null;
  created_at: string;

  incidents:
    | {
        id: number;
        status:
          | "detected"
          | "reviewing"
          | "notified"
          | "resolved";
        severity:
          | "low"
          | "medium"
          | "high";
        kind:
          | "full_pass"
          | "dispatch_delay"
          | "transfer_failure";
        report_count: number;

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
      }
    | {
        id: number;
        status:
          | "detected"
          | "reviewing"
          | "notified"
          | "resolved";
        severity:
          | "low"
          | "medium"
          | "high";
        kind:
          | "full_pass"
          | "dispatch_delay"
          | "transfer_failure";
        report_count: number;

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
      }[]
    | null;
};

const reportLabels = {
  full_pass: "만차 통과",
  dispatch_delay: "배차 지연",
  transfer_failure: "환승 실패",
} as const;

export default async function IncidentsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("alerts")
    .select(
      `
        id,
        incident_id,
        title,
        body,
        action_url,
        is_simulated,
        sent_at,
        created_at,
        incidents (
          id,
          status,
          severity,
          kind,
          report_count,
          transit_stops (
            name,
            stop_number,
            district_name
          )
        )
      `,
    )
    .eq("audience", "citizen")
    .order("created_at", {
      ascending: false,
    })
    .limit(30);

  const alerts =
    (data ?? []) as CitizenAlert[];

  return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header>
          <Badge variant="danger">
            실시간 교통
          </Badge>

          <h1 className="mt-3 text-2xl font-bold text-main sm:text-3xl">
            교통 상황 알림
          </h1>

          <p className="mt-2 text-sm leading-6 text-secondary">
            시민 신고와 관리자 검토를 거친 교통
            상황을 확인하세요.
          </p>
        </header>

        <Card>
          <SectionHeader
            title="최근 알림"
            description="최신순으로 표시됩니다."
            action={
              <Badge variant="info">
                {alerts.length}건
              </Badge>
            }
          />

          {error ? (
            <div
              role="alert"
              className="mt-5 rounded-control bg-danger-soft p-4 text-sm text-danger"
            >
              교통 알림을 불러오지 못했습니다.
            </div>
          ) : alerts.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="새로운 교통 알림이 없습니다"
                description="관리자가 시민 안내를 완료하면 이곳에 표시됩니다."
              />
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                />
              ))}
            </ul>
          )}
        </Card>

        <p className="text-center text-xs leading-5 text-muted">
          프로토타입에서는 웹앱 내부 알림만
          제공하며 실제 문자나 카카오톡 메시지를
          발송하지 않습니다.
        </p>
      </div>
  );
}

type AlertItemProps = {
  alert: CitizenAlert;
};

function AlertItem({
  alert,
}: AlertItemProps) {
  const incident = Array.isArray(
    alert.incidents,
  )
    ? alert.incidents[0]
    : alert.incidents;

  const stop = incident
    ? Array.isArray(
        incident.transit_stops,
      )
      ? incident.transit_stops[0]
      : incident.transit_stops
    : null;

  const href =
    alert.action_url ??
    `/incidents/${alert.incident_id}`;

  return (
    <li>
      <Link
        href={href}
        className="block rounded-card border border-line p-4 transition-colors hover:bg-surface-muted"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-main">
              {alert.title}
            </p>

            <p className="mt-1 text-xs text-muted">
              {stop?.name ??
                "정류장 정보 없음"}
              {incident
                ? ` · ${
                    reportLabels[
                      incident.kind
                    ]
                  }`
                : ""}
            </p>
          </div>

          {incident && (
            <SeverityBadge
              severity={incident.severity}
            />
          )}
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-secondary">
          {alert.body}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted">
            {formatDateTime(
              alert.sent_at ??
                alert.created_at,
            )}
          </span>

          <span className="text-xs font-semibold text-brand-text">
            자세히 보기 →
          </span>
        </div>
      </Link>
    </li>
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
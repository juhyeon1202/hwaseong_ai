import Link from "next/link";

import {
  Badge,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import {
  createClient,
} from "@/lib/supabase/server";

type DrtAction = {
  id: number;
  incident_id:
    | number
    | null;
  status:
    | "draft"
    | "pending_review"
    | "approved"
    | "rejected"
    | "simulated"
    | "completed"
    | "failed";
  title: string;
  content: string;
  payload:
    | Record<string, unknown>
    | null;
  created_at: string;

  incidents:
    | {
        id: number;
        kind:
          | "full_pass"
          | "dispatch_delay"
          | "transfer_failure";
        severity:
          | "low"
          | "medium"
          | "high";
        report_count: number;
        route_number:
          | string
          | null;

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
      }
    | {
        id: number;
        kind:
          | "full_pass"
          | "dispatch_delay"
          | "transfer_failure";
        severity:
          | "low"
          | "medium"
          | "high";
        report_count: number;
        route_number:
          | string
          | null;

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
      }[]
    | null;
};

type RuleSummary = {
  score: number | null;
  radiusKm: number | null;
  incidentCount: number | null;
  totalReportCount:
    | number
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

export async function AdminDrtQueue() {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("ai_actions")
    .select(
      `
        id,
        incident_id,
        status,
        title,
        content,
        payload,
        created_at,
        incidents (
          id,
          kind,
          severity,
          report_count,
          route_number,
          transit_stops (
            name,
            stop_number,
            district_name
          )
        )
      `,
    )
    .eq(
      "action_type",
      "drt_recommendation",
    )
    .in("status", [
      "draft",
      "pending_review",
    ])
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  const actions =
    (data ?? []) as DrtAction[];

  return (
    <Card className="border-brand-line">
      <SectionHeader
        title="똑버스 검토 대기"
        description="교통 사건 규칙을 충족해 관리자 판단이 필요한 검토안입니다."
        action={
          <Badge variant="warning">
            {actions.length}
            건 대기
          </Badge>
        }
      />

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-control border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          똑버스 검토 대기 목록을
          불러오지 못했습니다.
        </div>
      ) : actions.length ===
        0 ? (
        <div className="mt-5">
          <EmptyState
            title="대기 중인 똑버스 검토안이 없습니다."
            description="교통 사건이 규칙을 충족하면 이곳에 검토안이 표시됩니다."
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {actions.map(
            (action) => (
              <DrtQueueItem
                key={
                  action.id
                }
                action={
                  action
                }
              />
            ),
          )}
        </ul>
      )}

      <div className="mt-5 rounded-control border border-warning/30 bg-warning-soft px-4 py-3">
        <p className="text-xs leading-5 text-warning">
          검토 대기안은 실제 차량
          호출이 아닙니다. 사건 상세에서
          관리자가 승인해야 모의 호출
          기록으로 전환됩니다.
        </p>
      </div>
    </Card>
  );
}

function DrtQueueItem({
  action,
}: {
  action: DrtAction;
}) {
  const incident =
    Array.isArray(
      action.incidents,
    )
      ? action.incidents[0]
      : action.incidents;

  const stop =
    incident
      ? Array.isArray(
          incident.transit_stops,
        )
        ? incident
            .transit_stops[0]
        : incident.transit_stops
      : null;

  const ruleSummary =
    readRuleSummary(
      action.payload,
    );

  const href =
    action.incident_id
      ? `/admin/incidents/${action.incident_id}`
      : "/admin/incidents";

  return (
    <li>
      <Link
        href={href}
        className="block rounded-card border border-line p-4 transition-colors hover:border-brand-line hover:bg-brand-softer"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">
                검토 대기
              </Badge>

              {incident && (
                <SeverityBadge
                  severity={
                    incident.severity
                  }
                />
              )}
            </div>

            <h3 className="mt-3 truncate font-bold text-main">
              {stop?.name ??
                action.title}
            </h3>

            <p className="mt-1 text-xs text-muted">
              {stop?.stop_number ??
                "정류장 번호 없음"}

              {stop?.district_name
                ? ` · ${stop.district_name}`
                : ""}

              {incident
                ? ` · ${reportLabels[incident.kind]}`
                : ""}
            </p>
          </div>

          {ruleSummary.score !==
            null && (
            <div className="shrink-0 rounded-control bg-brand-soft px-3 py-2 text-center">
              <p className="text-[11px] text-brand-text">
                규칙 점수
              </p>

              <strong className="mt-1 block text-lg text-brand-text">
                {
                  ruleSummary.score
                }
                점
              </strong>
            </div>
          )}
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-secondary">
          {action.content}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <QueueInfo
            label="신고 건수"
            value={
              incident
                ? `${incident.report_count}건`
                : "정보 없음"
            }
          />

          <QueueInfo
            label="분석 반경"
            value={
              ruleSummary.radiusKm !==
              null
                ? `${ruleSummary.radiusKm}km`
                : "정보 없음"
            }
          />

          <QueueInfo
            label="관련 사건"
            value={
              ruleSummary.incidentCount !==
              null
                ? `${ruleSummary.incidentCount}건`
                : "정보 없음"
            }
          />

          <QueueInfo
            label="집계 신고"
            value={
              ruleSummary.totalReportCount !==
              null
                ? `${ruleSummary.totalReportCount}건`
                : "정보 없음"
            }
          />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="text-xs text-muted">
            {formatDateTime(
              action.created_at,
            )}
          </span>

          <span className="text-sm font-bold text-brand-text">
            상세 검토 →
          </span>
        </div>
      </Link>
    </li>
  );
}

function QueueInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-control bg-surface-muted px-3 py-2">
      <p className="text-[11px] text-muted">
        {label}
      </p>

      <p className="mt-1 text-xs font-bold text-main">
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

function readRuleSummary(
  payload:
    | Record<string, unknown>
    | null,
): RuleSummary {
  const empty: RuleSummary = {
    score: null,
    radiusKm: null,
    incidentCount: null,
    totalReportCount:
      null,
  };

  if (
    !payload ||
    typeof payload !==
      "object"
  ) {
    return empty;
  }

  const ruleResult =
    payload.ruleResult;

  if (
    !isRecord(ruleResult)
  ) {
    return empty;
  }

  const evidence =
    isRecord(
      ruleResult.evidence,
    )
      ? ruleResult.evidence
      : null;

  return {
    score:
      readNumber(
        ruleResult.score,
      ),

    radiusKm:
      readNumber(
        evidence?.radiusKm,
      ),

    incidentCount:
      readNumber(
        evidence?.incidentCount,
      ),

    totalReportCount:
      readNumber(
        evidence?.totalReportCount,
      ),
  };
}

function readNumber(
  value: unknown,
) {
  return typeof value ===
    "number"
    ? value
    : null;
}

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
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
  ).format(
    new Date(value),
  );
}
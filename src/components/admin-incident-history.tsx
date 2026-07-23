import {
  Badge,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import {
  createClient,
} from "@/lib/supabase/server";

type ActionType =
  | "citizen_alert"
  | "drt_recommendation"
  | "official_document"
  | "route_recommendation"
  | "report_generation";

type ActionStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "simulated"
  | "completed"
  | "failed";

type AiAction = {
  id: number;
  action_type: ActionType;
  status: ActionStatus;
  title: string;
  content: string;

  payload:
    | Record<string, unknown>
    | null;

  reviewed_by:
    | string
    | null;

  reviewed_at:
    | string
    | null;

  executed_at:
    | string
    | null;

  created_at: string;
  updated_at: string;
};

type AdminIncidentHistoryProps = {
  incidentId: number;
};

const actionTypeLabels: Record<
  ActionType,
  string
> = {
  citizen_alert:
    "시민 안내",

  drt_recommendation:
    "똑버스 검토",

  official_document:
    "공식 문서",

  route_recommendation:
    "노선 추천",

  report_generation:
    "관리 기록",
};

export async function AdminIncidentHistory({
  incidentId,
}: AdminIncidentHistoryProps) {
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
        action_type,
        status,
        title,
        content,
        payload,
        reviewed_by,
        reviewed_at,
        executed_at,
        created_at,
        updated_at
      `,
    )
    .eq(
      "incident_id",
      incidentId,
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  const actions =
    (data ?? []) as AiAction[];

  return (
    <Card>
      <SectionHeader
        title="관리자 처리 이력"
        description="AI 분석 검토와 사건 처리 기록을 최신순으로 표시합니다."
        action={
          <Badge variant="brand">
            {actions.length}
            건
          </Badge>
        }
      />

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-control border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          관리자 처리 이력을
          불러오지 못했습니다.
        </div>
      ) : actions.length ===
        0 ? (
        <div className="mt-5">
          <EmptyState
            title="아직 처리 이력이 없습니다."
            description="AI 분석 승인, 똑버스 검토 또는 사건 종결 작업을 수행하면 기록이 표시됩니다."
          />
        </div>
      ) : (
        <ol className="relative mt-6 space-y-0">
          {actions.map(
            (
              action,
              index,
            ) => (
              <HistoryItem
                key={
                  action.id
                }
                action={
                  action
                }
                isLast={
                  index ===
                  actions.length -
                    1
                }
              />
            ),
          )}
        </ol>
      )}
    </Card>
  );
}

function HistoryItem({
  action,
  isLast,
}: {
  action: AiAction;
  isLast: boolean;
}) {
  const summary =
    readPayloadSummary(
      action.payload,
    );

  return (
    <li className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-4">
      <div className="relative flex justify-center">
        <span
          className={[
            "relative z-10 mt-1 flex size-8 items-center justify-center rounded-full border-4 border-surface text-xs font-bold",
            getTimelineColor(
              action.status,
            ),
          ].join(" ")}
        >
          {getActionIcon(
            action.action_type,
          )}
        </span>

        {!isLast && (
          <span
            aria-hidden="true"
            className="absolute top-8 bottom-0 w-px bg-line"
          />
        )}
      </div>

      <div
        className={[
          "min-w-0",
          isLast
            ? "pb-0"
            : "pb-6",
        ].join(" ")}
      >
        <div className="rounded-card border border-line bg-surface p-4 transition-colors hover:bg-surface-muted">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">
                  {
                    actionTypeLabels[
                      action
                        .action_type
                    ]
                  }
                </Badge>

                <ActionStatusBadge
                  status={
                    action.status
                  }
                />
              </div>

              <h3 className="mt-3 font-bold text-main">
                {
                  action.title
                }
              </h3>
            </div>

            <span className="shrink-0 text-xs text-muted">
              {formatDateTime(
                action.reviewed_at ??
                  action.executed_at ??
                  action.created_at,
              )}
            </span>
          </div>

          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-secondary">
            {action.content}
          </p>

          {summary.length > 0 && (
            <dl className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
              {summary.map(
                (item) => (
                  <div
                    key={
                      item.label
                    }
                    className="rounded-control bg-surface-muted px-3 py-2"
                  >
                    <dt className="text-[11px] text-muted">
                      {
                        item.label
                      }
                    </dt>

                    <dd className="mt-1 text-xs font-semibold text-main">
                      {
                        item.value
                      }
                    </dd>
                  </div>
                ),
              )}
            </dl>
          )}

          <p className="mt-3 text-[11px] text-muted">
            기록 번호 #
            {action.id}
          </p>
        </div>
      </div>
    </li>
  );
}

function ActionStatusBadge({
  status,
}: {
  status: ActionStatus;
}) {
  if (
    status === "completed" ||
    status === "simulated"
  ) {
    return (
      <Badge variant="success">
        {status ===
        "simulated"
          ? "모의 처리 완료"
          : "처리 완료"}
      </Badge>
    );
  }

  if (
    status === "rejected"
  ) {
    return (
      <Badge variant="danger">
        반려
      </Badge>
    );
  }

  if (
    status === "failed"
  ) {
    return (
      <Badge variant="danger">
        처리 실패
      </Badge>
    );
  }

  if (
    status ===
    "pending_review"
  ) {
    return (
      <Badge variant="warning">
        검토 대기
      </Badge>
    );
  }

  if (
    status === "approved"
  ) {
    return (
      <Badge variant="info">
        승인
      </Badge>
    );
  }

  return (
    <Badge variant="brand">
      초안
    </Badge>
  );
}

function getTimelineColor(
  status: ActionStatus,
) {
  if (
    status === "completed" ||
    status === "simulated"
  ) {
    return "bg-success text-white";
  }

  if (
    status === "rejected" ||
    status === "failed"
  ) {
    return "bg-danger text-white";
  }

  if (
    status ===
    "pending_review"
  ) {
    return "bg-warning text-white";
  }

  return "bg-brand text-on-brand";
}

function getActionIcon(
  actionType: ActionType,
) {
  if (
    actionType ===
    "drt_recommendation"
  ) {
    return "D";
  }

  if (
    actionType ===
    "citizen_alert"
  ) {
    return "A";
  }

  if (
    actionType ===
    "report_generation"
  ) {
    return "R";
  }

  return "AI";
}

function readPayloadSummary(
  payload:
    | Record<string, unknown>
    | null,
) {
  if (!payload) {
    return [];
  }

  const items: {
    label: string;
    value: string;
  }[] = [];

  if (
    typeof payload.previousStatus ===
    "string"
  ) {
    items.push({
      label: "이전 상태",
      value:
        getStatusLabel(
          payload.previousStatus,
        ),
    });
  }

  if (
    typeof payload.nextStatus ===
    "string"
  ) {
    items.push({
      label: "변경 상태",
      value:
        getStatusLabel(
          payload.nextStatus,
        ),
    });
  }

  if (
    typeof payload.actualDispatch ===
    "boolean"
  ) {
    items.push({
      label: "실제 차량 호출",
      value:
        payload.actualDispatch
          ? "호출됨"
          : "호출하지 않음",
    });
  }

  if (
    payload.simulatedDispatch ===
    true
  ) {
    items.push({
      label: "프로토타입 처리",
      value:
        "모의 호출 승인",
    });
  }

  const ruleResult =
    payload.ruleResult;

  if (
    isRecord(
      ruleResult,
    )
  ) {
    if (
      typeof ruleResult.score ===
      "number"
    ) {
      items.push({
        label: "규칙 점수",
        value:
          `${ruleResult.score}점`,
      });
    }

    const evidence =
      ruleResult.evidence;

    if (
      isRecord(
        evidence,
      ) &&
      typeof evidence.totalReportCount ===
        "number"
    ) {
      items.push({
        label: "집계 신고",
        value:
          `${evidence.totalReportCount}건`,
      });
    }
  }

  return items;
}

function getStatusLabel(
  status: string,
) {
  const labels: Record<
    string,
    string
  > = {
    detected:
      "감지됨",
    reviewing:
      "검토 중",
    notified:
      "시민 안내",
    resolved:
      "해결 완료",
  };

  return (
    labels[status] ??
    status
  );
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
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "시간 정보 없음";
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}
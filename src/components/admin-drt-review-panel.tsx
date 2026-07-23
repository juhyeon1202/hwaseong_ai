"use client";

import {
  useState,
} from "react";

import {
  Badge,
  Button,
  Card,
} from "@/components/ui";

type ActionStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "simulated"
  | "completed"
  | "failed";

type DrtAction = {
  id: number;
  status: ActionStatus;
  title: string;
  content: string;
  payload:
    | Record<string, unknown>
    | null;
  created_at?: string;
};

type DrtRuleResult = {
  eligible: boolean;
  score: number;
  level:
    | "none"
    | "review"
    | "priority";
  title: string;
  reason: string;
  evidence: {
    radiusKm: number;
    timeWindowMinutes: number;
    incidentCount: number;
    totalReportCount: number;
    maximumSeverity: string;
  };
};

type DrtResponse = {
  success: boolean;
  created?: boolean;
  message?: string;
  action?: DrtAction;
  result?: DrtRuleResult;
};

export function AdminDrtReviewPanel({
  incidentId,
}: {
  incidentId: number;
}) {
  const [action, setAction] =
    useState<DrtAction | null>(
      null,
    );

  const [ruleResult, setRuleResult] =
    useState<DrtRuleResult | null>(
      null,
    );

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [reviewingDecision, setReviewingDecision] =
    useState<
      "approve" | "reject" | null
    >(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function createReview() {
    setIsGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/incidents/${incidentId}/drt-review`,
        {
          method: "POST",
          headers: {
            Accept:
              "application/json",
          },
        },
      );

      const result =
        (await response.json()) as DrtResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "똑버스 검토안을 생성하지 못했습니다.",
        );
      }

      setRuleResult(
        result.result ??
          null,
      );

      setAction(
        result.action ??
          null,
      );

      setMessage(
        result.message ??
          "똑버스 검토가 완료되었습니다.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "똑버스 검토 중 오류가 발생했습니다.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function reviewAction(
    decision:
      | "approve"
      | "reject",
  ) {
    if (!action) {
      return;
    }

    const confirmation =
      decision === "approve"
        ? "똑버스 모의 호출을 승인할까요?"
        : "똑버스 호출 검토안을 반려할까요?";

    if (
      !window.confirm(
        confirmation,
      )
    ) {
      return;
    }

    setReviewingDecision(
      decision,
    );
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/drt-actions/${action.id}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },
          body: JSON.stringify({
            decision,
          }),
        },
      );

      const result =
        (await response.json()) as DrtResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "똑버스 검토 처리에 실패했습니다.",
        );
      }

      if (result.action) {
        setAction(
          result.action,
        );
      }

      setMessage(
        result.message ??
          "검토 결과를 저장했습니다.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "똑버스 검토 처리 중 오류가 발생했습니다.",
      );
    } finally {
      setReviewingDecision(
        null,
      );
    }
  }

  const canReview =
    action?.status ===
      "draft" ||
    action?.status ===
      "pending_review";

  return (
    <Card className="border-brand-line">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">
              똑버스 검토
            </Badge>

            {action && (
              <ActionStatusBadge
                status={
                  action.status
                }
              />
            )}
          </div>

          <h2 className="mt-3 text-xl font-bold text-main">
            대체 교통수단 검토
          </h2>

          <p className="mt-2 text-sm leading-6 text-secondary">
            정류장 반경 2.5km와
            최근 30분의 만차·배차
            지연 사건을 규칙으로
            판정합니다.
          </p>
        </div>

        <Button
          type="button"
          onClick={createReview}
          disabled={
            isGenerating ||
            reviewingDecision !== null
          }
          className="shrink-0"
        >
          {isGenerating
            ? "규칙 분석 중..."
            : action
              ? "검토안 다시 확인"
              : "똑버스 검토안 생성"}
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-control border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-5 rounded-control border border-success/30 bg-success-soft p-4 text-sm text-success"
        >
          {message}
        </div>
      )}

      {ruleResult && (
        <div className="mt-6 space-y-4">
          <div
            className={[
              "rounded-card border p-5",
              ruleResult.eligible
                ? "border-warning/30 bg-warning-soft"
                : "border-line bg-surface-muted",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-muted">
                  규칙 판정 결과
                </p>

                <h3 className="mt-2 font-bold text-main">
                  {
                    ruleResult.title
                  }
                </h3>
              </div>

              <strong className="text-2xl text-brand-text">
                {
                  ruleResult.score
                }
                점
              </strong>
            </div>

            <p className="mt-4 text-sm leading-7 text-secondary">
              {
                ruleResult.reason
              }
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <EvidenceItem
              label="분석 반경"
              value={`${ruleResult.evidence.radiusKm}km`}
            />

            <EvidenceItem
              label="집계 시간"
              value={`${ruleResult.evidence.timeWindowMinutes}분`}
            />

            <EvidenceItem
              label="관련 사건"
              value={`${ruleResult.evidence.incidentCount}건`}
            />

            <EvidenceItem
              label="총 신고"
              value={`${ruleResult.evidence.totalReportCount}건`}
            />
          </div>
        </div>
      )}

      {action && (
        <div className="mt-5 rounded-card border border-brand-line bg-brand-softer p-5">
          <h3 className="font-bold text-main">
            {action.title}
          </h3>

          <p className="mt-3 text-sm leading-7 text-secondary">
            {action.content}
          </p>

          {canReview && (
            <div className="mt-5 grid gap-3 border-t border-brand-line pt-5 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() =>
                  reviewAction(
                    "approve",
                  )
                }
                disabled={
                  reviewingDecision !==
                  null
                }
                fullWidth
              >
                {reviewingDecision ===
                "approve"
                  ? "승인 처리 중..."
                  : "모의 호출 승인"}
              </Button>

              <Button
                type="button"
                variant="danger"
                onClick={() =>
                  reviewAction(
                    "reject",
                  )
                }
                disabled={
                  reviewingDecision !==
                  null
                }
                fullWidth
              >
                {reviewingDecision ===
                "reject"
                  ? "반려 처리 중..."
                  : "호출 검토 반려"}
              </Button>
            </div>
          )}
        </div>
      )}

      <p className="mt-5 text-xs leading-5 text-muted">
        프로토타입에서는 실제 똑버스
        배차 API를 호출하지 않습니다.
        승인 결과는 모의 호출 기록으로만
        저장됩니다.
      </p>
    </Card>
  );
}

function EvidenceItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-control border border-line bg-surface p-4">
      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-2 font-bold text-main">
        {value}
      </p>
    </div>
  );
}

function ActionStatusBadge({
  status,
}: {
  status: ActionStatus;
}) {
  if (
    status === "simulated" ||
    status === "completed"
  ) {
    return (
      <Badge variant="success">
        모의 호출 승인
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

  return (
    <Badge variant="warning">
      검토 대기
    </Badge>
  );
}
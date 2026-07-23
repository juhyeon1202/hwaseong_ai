"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
} from "react";

import {
  Badge,
  Button,
  Card,
} from "@/components/ui";

type IncidentStatus =
  | "detected"
  | "reviewing"
  | "notified"
  | "resolved";

type AdminIncidentResolutionPanelProps = {
  incidentId: number;
  status: IncidentStatus;

  evidence:
    | Record<string, unknown>
    | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
};

type LatestResolution = {
  action:
    | "resolved"
    | "reopened";
  note: string;
  createdAt: string;
};

export function AdminIncidentResolutionPanel({
  incidentId,
  status,
  evidence,
}: AdminIncidentResolutionPanelProps) {
  const router =
    useRouter();

  const [note, setNote] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [message, setMessage] =
    useState<string | null>(
      null,
    );

  const latestResolution =
    readLatestResolution(
      evidence,
    );

  const isResolved =
    status === "resolved";

  async function submitDecision(
    decision:
      | "resolve"
      | "reopen",
  ) {
    if (
      decision ===
        "resolve" &&
      note.trim().length < 2
    ) {
      setError(
        "사건 처리 메모를 2자 이상 작성해 주세요.",
      );

      return;
    }

    const confirmation =
      decision === "resolve"
        ? "이 교통 사건을 해결 완료 상태로 변경할까요?"
        : "해결 완료된 사건을 다시 검토할까요?";

    if (
      !window.confirm(
        confirmation,
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/incidents/${incidentId}/resolution`,
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
            note:
              note.trim(),
          }),
        },
      );

      const result =
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "사건 상태를 변경하지 못했습니다.",
        );
      }

      setMessage(
        result.message ??
          "사건 상태가 변경되었습니다.",
      );

      setNote("");

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "사건 상태 변경 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card
      className={
        isResolved
          ? "border-success/30"
          : "border-brand-line"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            isResolved
              ? "success"
              : "brand"
          }
        >
          사건 처리
        </Badge>

        <StatusBadge
          status={
            status
          }
        />
      </div>

      <h2 className="mt-3 text-xl font-bold text-main">
        {isResolved
          ? "사건 처리 완료"
          : "사건 종결 처리"}
      </h2>

      <p className="mt-2 text-sm leading-6 text-secondary">
        {isResolved
          ? "이 사건은 해결 완료 상태입니다. 추가 문제가 발생하면 다시 검토할 수 있습니다."
          : "현장 확인과 대응이 끝난 경우 처리 메모를 남기고 사건을 종결합니다."}
      </p>

      {latestResolution && (
        <div className="mt-5 rounded-card border border-line bg-surface-muted p-4">
          <p className="text-xs font-semibold text-muted">
            최근 처리 기록
          </p>

          <p className="mt-2 text-sm font-semibold text-main">
            {latestResolution.action ===
            "resolved"
              ? "해결 완료"
              : "재검토 시작"}
          </p>

          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-secondary">
            {
              latestResolution.note
            }
          </p>

          <p className="mt-3 text-xs text-muted">
            {formatDateTime(
              latestResolution.createdAt,
            )}
          </p>
        </div>
      )}

      <div className="mt-5">
        <label
          htmlFor="resolution-note"
          className="text-sm font-bold text-main"
        >
          {isResolved
            ? "재검토 메모"
            : "사건 처리 메모"}
        </label>

        <textarea
          id="resolution-note"
          value={note}
          onChange={(event) =>
            setNote(
              event.target.value,
            )
          }
          maxLength={1000}
          rows={4}
          placeholder={
            isResolved
              ? "사건을 다시 검토하는 이유를 작성해 주세요."
              : "현장 확인 결과와 처리 내용을 작성해 주세요."
          }
          className="mt-2 w-full resize-y rounded-control border border-line bg-surface px-4 py-3 text-sm leading-6 text-main outline-none transition-colors placeholder:text-muted focus:border-brand"
        />

        <p className="mt-1 text-right text-xs text-muted">
          {note.length}
          /1,000
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-control border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-4 rounded-control border border-success/30 bg-success-soft p-4 text-sm text-success"
        >
          {message}
        </div>
      )}

      <div className="mt-5">
        {isResolved ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              submitDecision(
                "reopen",
              )
            }
            disabled={
              isSubmitting
            }
            fullWidth
          >
            {isSubmitting
              ? "재검토 처리 중..."
              : "사건 다시 열기"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() =>
              submitDecision(
                "resolve",
              )
            }
            disabled={
              isSubmitting
            }
            fullWidth
          >
            {isSubmitting
              ? "종결 처리 중..."
              : "해결 완료 처리"}
          </Button>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({
  status,
}: {
  status: IncidentStatus;
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

function readLatestResolution(
  evidence:
    | Record<string, unknown>
    | null,
): LatestResolution | null {
  if (
    !evidence ||
    typeof evidence !==
      "object"
  ) {
    return null;
  }

  const value =
    evidence.latestResolution;

  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  const action =
    record.action;

  if (
    action !== "resolved" &&
    action !== "reopened"
  ) {
    return null;
  }

  return {
    action,

    note:
      typeof record.note ===
      "string"
        ? record.note
        : "처리 메모 없음",

    createdAt:
      typeof record.createdAt ===
      "string"
        ? record.createdAt
        : "",
  };
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
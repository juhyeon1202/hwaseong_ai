"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
} from "react";

import {
  ActionResultModal,
} from "@/components/action-result-modal";
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

type ResultModalState = {
  open: boolean;
  title: string;
  message: string;
  status: "success" | "error";
  refresh: boolean;
};

const initialResultModal: ResultModalState = {
  open: false,
  title: "",
  message: "",
  status: "success",
  refresh: false,
};

export function AdminIncidentResolutionPanel({
  incidentId,
  status,
  evidence,
}: AdminIncidentResolutionPanelProps) {
  const router = useRouter();

  const [note, setNote] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    resultModal,
    setResultModal,
  ] = useState<ResultModalState>(
    initialResultModal,
  );

  const latestResolution =
    readLatestResolution(evidence);

  const isResolved =
    status === "resolved";

  async function submitDecision(
    decision:
      | "resolve"
      | "reopen",
  ) {
    const trimmedNote =
      note.trim();

    if (
      decision === "resolve" &&
      trimmedNote.length < 2
    ) {
      setResultModal({
        open: true,
        title: "처리 메모 확인",
        message:
          "사건 처리 메모를 2자 이상 작성해 주세요.",
        status: "error",
        refresh: false,
      });

      return;
    }

    if (
      decision === "reopen" &&
      trimmedNote.length < 2
    ) {
      setResultModal({
        open: true,
        title: "재검토 메모 확인",
        message:
          "재검토가 필요한 이유를 2자 이상 작성해 주세요.",
        status: "error",
        refresh: false,
      });

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

    try {
      const response =
        await fetch(
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
              note: trimmedNote,
            }),
          },
        );

      const result =
        await readApiResponse(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "사건 상태를 변경하지 못했습니다.",
        );
      }

      setNote("");

      setResultModal({
        open: true,
        title:
          decision === "resolve"
            ? "사건 해결 완료"
            : "사건 재검토 시작",
        message:
          result.message ??
          (decision === "resolve"
            ? "교통 사건을 해결 완료 상태로 변경했습니다."
            : "교통 사건을 재검토 상태로 변경했습니다."),
        status: "success",
        refresh: true,
      });
    } catch (requestError) {
      setResultModal({
        open: true,
        title:
          decision === "resolve"
            ? "사건 해결 처리 실패"
            : "사건 재검토 처리 실패",
        message:
          requestError instanceof Error
            ? requestError.message
            : "사건 상태 변경 중 오류가 발생했습니다.",
        status: "error",
        refresh: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeResultModal() {
    const shouldRefresh =
      resultModal.refresh;

    setResultModal(
      initialResultModal,
    );

    if (shouldRefresh) {
      router.refresh();
    }
  }

  return (
    <>
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
            status={status}
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
            : "현장 확인과 대응이 끝난 경우 처리 메모를 남기고 사건을 종결할 수 있습니다."}
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
            htmlFor={`resolution-note-${incidentId}`}
            className="text-sm font-bold text-main"
          >
            {isResolved
              ? "재검토 메모"
              : "사건 처리 메모"}
          </label>

          <textarea
            id={`resolution-note-${incidentId}`}
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

        <div className="mt-5">
          {isResolved ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void submitDecision(
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
                void submitDecision(
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

      <ActionResultModal
        open={resultModal.open}
        title={resultModal.title}
        message={
          resultModal.message
        }
        status={
          resultModal.status
        }
        onConfirm={
          closeResultModal
        }
      />
    </>
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

async function readApiResponse(
  response: Response,
): Promise<ApiResponse> {
  const responseText =
    await response.text();

  if (!responseText.trim()) {
    return {
      success: response.ok,
      message: response.ok
        ? undefined
        : `서버 요청에 실패했습니다. (${response.status})`,
    };
  }

  try {
    return JSON.parse(
      responseText,
    ) as ApiResponse;
  } catch {
    throw new Error(
      response.ok
        ? "서버가 올바른 JSON 응답을 반환하지 않았습니다."
        : `사건 처리 API 요청에 실패했습니다. (${response.status})`,
    );
  }
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
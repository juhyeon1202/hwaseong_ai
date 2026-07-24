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

type AdminIncidentAiPanelProps = {
  incidentId: number;
  status: IncidentStatus;
  requiresReview: boolean;
  aiSummary: string | null;
  citizenGuidance: string | null;
  adminRecommendation: string | null;
  modelName: string | null;
  evidence:
    | Record<string, unknown>
    | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
};

export function AdminIncidentAiPanel({
  incidentId,
  status,
  requiresReview,
  aiSummary,
  citizenGuidance,
  adminRecommendation,
  modelName,
  evidence,
}: AdminIncidentAiPanelProps) {
  const router = useRouter();

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [reviewingDecision, setReviewingDecision] =
    useState<
      "approve" | "reject" | null
    >(null);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const aiAnalysis =
    readAiAnalysis(evidence);

  const hasAnalysis =
    Boolean(
      aiSummary &&
        citizenGuidance &&
        adminRecommendation,
    );

  async function analyzeIncident() {
    setIsAnalyzing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/ai/incidents/${incidentId}/analyze`,
        {
          method: "POST",
          headers: {
            Accept:
              "application/json",
          },
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
            "AI 사건 분석에 실패했습니다.",
        );
      }

      setMessage(
        result.message ??
          "AI 분석이 완료되었습니다.",
      );

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "AI 사건 분석 중 오류가 발생했습니다.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function reviewAnalysis(
    decision:
      | "approve"
      | "reject",
  ) {
    const confirmationMessage =
      decision === "approve"
        ? "AI 분석을 승인하고 시민 안내 상태로 변경할까요?"
        : "AI 분석을 반려하고 재분석 대기 상태로 변경할까요?";

    if (
      !window.confirm(
        confirmationMessage,
      )
    ) {
      return;
    }

    setReviewingDecision(
      decision,
    );
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/incidents/${incidentId}/review`,
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
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "AI 분석 검토 처리에 실패했습니다.",
        );
      }

      setMessage(
        result.message ??
          "검토 결과가 저장되었습니다.",
      );

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "검토 처리 중 오류가 발생했습니다.",
      );
    } finally {
      setReviewingDecision(
        null,
      );
    }
  }

  return (
    <Card className="border-info/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">
              Gemini AI
            </Badge>

            <ReviewStatusBadge
              status={status}
              requiresReview={
                requiresReview
              }
              hasAnalysis={
                hasAnalysis
              }
            />

            {modelName && (
              <span className="text-xs text-muted">
                {modelName}
              </span>
            )}
          </div>

          <h2 className="mt-3 text-xl font-bold text-main">
            AI 교통 사건 분석
          </h2>

          <p className="mt-2 text-sm leading-6 text-secondary">
            익명 신고 집계와 정류장
            정보를 바탕으로 시민 안내와
            관리자 권장 조치를 생성합니다.
          </p>
        </div>

        <Button
          type="button"
          onClick={analyzeIncident}
          disabled={
            isAnalyzing ||
            reviewingDecision !== null ||
            status === "resolved"
          }
          className="shrink-0 bg-info hover:opacity-90"
        >
          {isAnalyzing
            ? "AI 분석 중..."
            : hasAnalysis
              ? "AI 다시 분석"
              : "AI 사건 분석"}
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-card border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-5 rounded-card border border-success/30 bg-success-soft p-4 text-sm text-success"
        >
          {message}
        </div>
      )}

      {!hasAnalysis ? (
        <div className="mt-5 rounded-card border border-dashed border-line bg-surface-muted p-8 text-center">
          <p className="font-semibold text-main">
            아직 AI 분석 결과가
            없습니다.
          </p>

          <p className="mt-2 text-sm leading-6 text-muted">
            AI 사건 분석 버튼을 누르면
            분석 결과가 Supabase에
            저장됩니다.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <AnalysisSection
            title="사건 요약"
            content={
              aiSummary ??
              "요약 없음"
            }
          />

          <AnalysisSection
            title="시민 안내문"
            content={
              citizenGuidance ??
              "시민 안내 없음"
            }
            variant="brand"
          />

          <AnalysisSection
            title="관리자 권장 조치"
            content={
              formatNumberedSteps(
                adminRecommendation ??
                  "권장 조치 없음",
              )
            }
            variant="warning"
          />

          {aiAnalysis?.nearbyContext && (
            <AnalysisSection
              title="주변 실시간 교통·기상 정보"
              content={
                aiAnalysis.nearbyContext
              }
              variant="brand"
            />
          )}

          {aiAnalysis &&
            aiAnalysis.externalEvidence.length > 0 && (
              <div className="rounded-card border border-line bg-surface-muted p-5">
                <h3 className="font-bold text-main">
                  외부 정보 교차 확인
                </h3>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                  {aiAnalysis.externalEvidence.map(
                    (item, index) => (
                      <li key={`${index}-${item}`}>
                        {index + 1}. {item}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

          {aiAnalysis &&
            aiAnalysis.sources.length > 0 && (
              <div className="rounded-card border border-line bg-white p-5">
                <h3 className="font-bold text-main">
                  참고 출처
                </h3>

                <ul className="mt-3 space-y-2 text-sm leading-6">
                  {aiAnalysis.sources.map(
                    (source, index) => (
                      <li key={`${source.url}-${index}`}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand underline underline-offset-4"
                        >
                          {source.title}
                        </a>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

          {aiAnalysis && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-line bg-surface-muted p-4">
                <p className="text-xs font-semibold text-muted">
                  AI 판단 위험도
                </p>

                <p className="mt-2 font-bold text-main">
                  {getRiskLabel(
                    aiAnalysis.riskLevel,
                  )}
                </p>
              </div>

              <div
                className={[
                  "rounded-card border p-4",
                  aiAnalysis.drtReviewNeeded
                    ? "border-warning/30 bg-warning-soft"
                    : "border-line bg-surface-muted",
                ].join(" ")}
              >
                <p className="text-xs font-semibold text-muted">
                  똑버스 검토
                </p>

                <p className="mt-2 font-bold text-main">
                  {aiAnalysis.drtReviewNeeded
                    ? "호출 검토 필요"
                    : "현재 검토 불필요"}
                </p>
              </div>
            </div>
          )}

          {aiAnalysis?.drtReviewReason && (
            <AnalysisSection
              title="똑버스 검토 사유"
              content={
                aiAnalysis.drtReviewReason
              }
              variant="warning"
            />
          )}

          {aiAnalysis?.evidenceLimitations && (
            <AnalysisSection
              title="분석 한계"
              content={
                aiAnalysis.evidenceLimitations
              }
            />
          )}

          {requiresReview &&
            status !== "resolved" && (
              <div className="grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() =>
                    reviewAnalysis(
                      "approve",
                    )
                  }
                  disabled={
                    reviewingDecision !==
                      null ||
                    isAnalyzing
                  }
                  fullWidth
                >
                  {reviewingDecision ===
                  "approve"
                    ? "승인 처리 중..."
                    : "분석 승인"}
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  onClick={() =>
                    reviewAnalysis(
                      "reject",
                    )
                  }
                  disabled={
                    reviewingDecision !==
                      null ||
                    isAnalyzing
                  }
                  fullWidth
                >
                  {reviewingDecision ===
                  "reject"
                    ? "반려 처리 중..."
                    : "분석 반려"}
                </Button>
              </div>
            )}
        </div>
      )}
    </Card>
  );
}

function AnalysisSection({
  title,
  content,
  variant = "default",
}: {
  title: string;
  content: string;
  variant?:
    | "default"
    | "brand"
    | "warning";
}) {
  const variants = {
    default:
      "border-line bg-surface-muted",
    brand:
      "border-brand-line bg-brand-softer",
    warning:
      "border-warning/30 bg-warning-soft",
  };

  return (
    <section
      className={[
        "rounded-card border p-5",
        variants[variant],
      ].join(" ")}
    >
      <h3 className="text-sm font-bold text-main">
        {title}
      </h3>

      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-secondary">
        {content}
      </p>
    </section>
  );
}

function ReviewStatusBadge({
  status,
  requiresReview,
  hasAnalysis,
}: {
  status: IncidentStatus;
  requiresReview: boolean;
  hasAnalysis: boolean;
}) {
  if (status === "resolved") {
    return (
      <Badge variant="success">
        해결 완료
      </Badge>
    );
  }

  if (
    hasAnalysis &&
    requiresReview
  ) {
    return (
      <Badge variant="warning">
        관리자 검토 필요
      </Badge>
    );
  }

  if (
    status === "notified"
  ) {
    return (
      <Badge variant="success">
        승인 완료
      </Badge>
    );
  }

  return (
    <Badge variant="brand">
      분석 대기
    </Badge>
  );
}

type AiAnalysis = {
  riskLevel: string;
  drtReviewNeeded: boolean;
  drtReviewReason:
    | string
    | null;
  evidenceLimitations: string;
  nearbyContext: string;
  externalEvidence: string[];
  sources: Array<{
    title: string;
    url: string;
  }>;
};

function readAiAnalysis(
  evidence:
    | Record<string, unknown>
    | null,
): AiAnalysis | null {
  if (
    !evidence ||
    typeof evidence !== "object"
  ) {
    return null;
  }

  const value =
    evidence.aiAnalysis;

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const analysis =
    value as Record<
      string,
      unknown
    >;

  return {
    riskLevel:
      typeof analysis.riskLevel ===
      "string"
        ? analysis.riskLevel
        : "unknown",

    drtReviewNeeded:
      analysis.drtReviewNeeded ===
      true,

    drtReviewReason:
      typeof analysis.drtReviewReason ===
      "string"
        ? analysis.drtReviewReason
        : null,

    evidenceLimitations:
      typeof analysis.evidenceLimitations ===
      "string"
        ? analysis.evidenceLimitations
        : "",

    nearbyContext:
      typeof analysis.nearbyContext ===
      "string"
        ? analysis.nearbyContext
        : "",

    externalEvidence:
      Array.isArray(
        analysis.externalEvidence,
      )
        ? analysis.externalEvidence.filter(
            (item): item is string =>
              typeof item === "string",
          )
        : [],

    sources: Array.isArray(
      analysis.sources,
    )
      ? analysis.sources.flatMap(
          (item) => {
            if (
              !item ||
              typeof item !== "object" ||
              Array.isArray(item)
            ) {
              return [];
            }

            const source = item as Record<
              string,
              unknown
            >;

            if (
              typeof source.title !==
                "string" ||
              typeof source.url !== "string" ||
              !source.url.startsWith("http")
            ) {
              return [];
            }

            return [
              {
                title: source.title,
                url: source.url,
              },
            ];
          },
        )
      : [],
  };
}

function formatNumberedSteps(
  content: string,
) {
  return content
    .replace(
      /\s+(?=\d+\.\s)/g,
      "\n",
    )
    .trim();
}

function getRiskLabel(
  riskLevel: string,
) {
  if (riskLevel === "high") {
    return "높음";
  }

  if (riskLevel === "medium") {
    return "보통";
  }

  if (riskLevel === "low") {
    return "낮음";
  }

  return "판단 정보 없음";
}

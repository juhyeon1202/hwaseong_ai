"use client";

import { useState } from "react";

import {
  Badge,
  Button,
  Card,
} from "@/components/ui";

type AdminSummaryMetrics = {
  todayReportCount: number;
  activeIncidentCount: number;
  reviewIncidentCount: number;
  waitingInquiryCount: number;
  openRouteRequestCount: number;
  concentratedStops: {
    stopName: string;
    stopNumber: string;
    districtName: string;
    reportKind: string;
    routeNumber: string;
    reportCount: number;
    latestReportAt: string;
  }[];
};

type AdminSummaryResponse = {
  success: boolean;
  model?: string;
  generatedAt?: string;
  metrics?: AdminSummaryMetrics;
  summary?: string;
  message?: string;
};

export function AdminAiBriefing() {
  const [data, setData] =
    useState<AdminSummaryResponse | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function generateSummary() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/ai/admin-summary",
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );

      const contentType =
        response.headers.get(
          "content-type",
        );

      if (
        !contentType?.includes(
          "application/json",
        )
      ) {
        throw new Error(
          "AI 요약 API가 올바른 JSON 응답을 반환하지 않았습니다.",
        );
      }

      const result =
        (await response.json()) as AdminSummaryResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "AI 교통 브리핑을 생성하지 못했습니다.",
        );
      }

      setData(result);
    } catch (requestError) {
      console.error(
        "[Admin AI briefing error]",
        requestError,
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "AI 교통 브리핑 생성 중 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden border-info/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">
              Gemini AI
            </Badge>

            {data?.generatedAt && (
              <span className="text-xs text-muted">
                {formatGeneratedAt(
                  data.generatedAt,
                )}
              </span>
            )}
          </div>

          <h2 className="mt-3 text-xl font-bold text-main">
            AI 교통 브리핑
          </h2>

          <p className="mt-2 text-sm leading-6 text-secondary">
            익명 신고와 교통 사건,
            문의 및 노선 제안 현황을
            분석해 관리자 확인 항목을
            요약합니다.
          </p>
        </div>

        <Button
          type="button"
          onClick={generateSummary}
          disabled={isLoading}
          className="shrink-0 bg-info hover:opacity-90"
        >
          {isLoading
            ? "AI 분석 중..."
            : data
              ? "브리핑 다시 생성"
              : "AI 브리핑 생성"}
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-card border border-danger/30 bg-danger-soft p-4"
        >
          <p className="text-sm font-semibold text-danger">
            AI 브리핑을 생성하지
            못했습니다.
          </p>

          <p className="mt-1 text-sm leading-6 text-danger">
            {error}
          </p>
        </div>
      )}

      {!data && !error && (
        <div className="mt-5 rounded-card border border-dashed border-line bg-surface-muted px-5 py-8 text-center">
          <p className="font-semibold text-main">
            아직 생성된 AI 브리핑이
            없습니다.
          </p>

          <p className="mt-2 text-sm leading-6 text-muted">
            버튼을 누르면 현재 집계
            데이터를 기준으로 Gemini가
            관리자용 브리핑을 생성합니다.
          </p>
        </div>
      )}

      {data?.metrics &&
        data.summary && (
          <div className="mt-6 space-y-6">
            <MetricGrid
              metrics={data.metrics}
            />

            <div className="rounded-card border border-info/20 bg-info-soft p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-main">
                  AI 분석 결과
                </h3>

                {data.model && (
                  <span className="text-xs text-muted">
                    모델: {data.model}
                  </span>
                )}
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-secondary">
                {data.summary}
              </p>
            </div>

            <div className="rounded-control border border-warning/30 bg-warning-soft px-4 py-3">
              <p className="text-xs leading-5 text-warning">
                AI 분석 결과는 관리자
                판단을 지원하기 위한
                참고 자료입니다. 알림 발송,
                사건 처리 및 똑버스 호출은
                관리자가 데이터를 검토한
                후 결정해야 합니다.
              </p>
            </div>
          </div>
        )}
    </Card>
  );
}

function MetricGrid({
  metrics,
}: {
  metrics: AdminSummaryMetrics;
}) {
  const items = [
    {
      label: "오늘 익명 신고",
      value:
        metrics.todayReportCount,
      color: "text-brand-text",
    },
    {
      label: "진행 중 사건",
      value:
        metrics.activeIncidentCount,
      color: "text-danger",
    },
    {
      label: "검토 필요",
      value:
        metrics.reviewIncidentCount,
      color: "text-warning",
    },
    {
      label: "답변 대기 문의",
      value:
        metrics.waitingInquiryCount,
      color: "text-info",
    },
    {
      label: "노선 제안",
      value:
        metrics.openRouteRequestCount,
      color: "text-success",
    },
  ];

  return (
    <section
      aria-label="AI 분석 대상 현황"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-card border border-line bg-surface p-4"
        >
          <p className="text-xs font-medium text-muted">
            {item.label}
          </p>

          <p
            className={[
              "mt-2 text-2xl font-bold",
              item.color,
            ].join(" ")}
          >
            {item.value.toLocaleString()}

            <span className="ml-1 text-sm">
              건
            </span>
          </p>
        </div>
      ))}
    </section>
  );
}

function formatGeneratedAt(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  return `${new Intl.DateTimeFormat(
    "ko-KR",
    {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date)} 생성`;
}
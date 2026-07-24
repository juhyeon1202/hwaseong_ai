"use client";

import { useState } from "react";

import {
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";

export type PointHistoryEntry = {
  id: number;
  amount: number;
  reason: string;
  created_at: string;
};

const pointReasonLabels: Record<
  string,
  string
> = {
  attendance: "출석 보상",
  reward: "보상 지급",
  reward_draw: "룰렛 참여",
  admin_adjustment: "관리자 조정",
  referral: "추천인 보상",
  referral_signup:
    "추천인 코드 등록 보상",

  post_create: "게시글 작성",
  journal_create: "교통일지 작성",
  journal_streak_bonus:
    "교통일지 연속 출석 보너스",
};

type PointHistoryProps = {
  pointHistory: PointHistoryEntry[];
  hasError: boolean;
};

export function PointHistory({
  pointHistory,
  hasError,
}: PointHistoryProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const latestEntry =
    pointHistory[0] ?? null;

  return (
    <Card>
      <SectionHeader
        title="포인트 내역"
        description="최근 포인트 적립과 사용 기록"
      />

      {hasError ? (
        <p className="mt-5 text-sm text-danger">
          포인트 내역을 불러오지 못했습니다.
        </p>
      ) : pointHistory.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="포인트 내역이 없습니다"
            description="출석 체크로 첫 포인트를 받아보세요."
          />
        </div>
      ) : (
        <div className="mt-5">
          <button
            type="button"
            onClick={() =>
              setIsOpen((current) => !current)
            }
            aria-expanded={isOpen}
            className="flex min-h-14 w-full items-center justify-between gap-3 rounded-control bg-surface-muted px-4 text-left"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-main">
                {isOpen
                  ? "포인트 내역 접기"
                  : "포인트 내역 보기"}
              </p>

              {!isOpen && latestEntry && (
                <p className="mt-0.5 truncate text-xs text-muted">
                  최근:{" "}
                  {pointReasonLabels[
                    latestEntry.reason
                  ] ?? latestEntry.reason}
                  {" · "}
                  {latestEntry.amount > 0
                    ? "+"
                    : ""}
                  {latestEntry.amount.toLocaleString()}
                  P
                </p>
              )}
            </div>

            <ChevronIcon
              className={[
                "shrink-0 text-muted transition-transform duration-300",
                isOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{
              gridTemplateRows: isOpen
                ? "1fr"
                : "0fr",
            }}
          >
            <div className="overflow-hidden">
              <ul className="mt-3 max-h-80 divide-y divide-line-light overflow-y-auto rounded-control border border-line">
                {pointHistory.map(
                  (history) => (
                    <li
                      key={history.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-main">
                          {pointReasonLabels[
                            history.reason
                          ] ?? history.reason}
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          {formatDateTime(
                            history.created_at,
                          )}
                        </p>
                      </div>

                      <strong
                        className={[
                          "shrink-0",
                          history.amount > 0
                            ? "text-success"
                            : "text-danger",
                        ].join(" ")}
                      >
                        {history.amount > 0
                          ? "+"
                          : ""}
                        {history.amount.toLocaleString()}
                        P
                      </strong>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function ChevronIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`size-5 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
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

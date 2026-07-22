"use client";

import {
  useActionState,
} from "react";

import {
  drawReward,
  type RewardActionState,
} from "@/app/(protected)/rewards/actions";
import {
  Badge,
  Button,
  Card,
  SectionHeader,
} from "@/components/ui";

export type RewardOption = {
  id: number;
  name: string;
  description: string | null;
  rewardType:
    | "points"
    | "coupon"
    | "ticket";
  rewardValue: number;
  probability: number;
  stock: number | null;
};

type RewardRouletteProps = {
  points: number;
  rewards: RewardOption[];
};

const initialState: RewardActionState = {
  status: "idle",
  message: "",
};

const TICKET_COST = 300;

export function RewardRoulette({
  points,
  rewards,
}: RewardRouletteProps) {
  const [state, formAction, isPending] =
    useActionState(
      drawReward,
      initialState,
    );

  const displayedPoints =
    state.result?.remainingPoints ??
    points;

  const canDraw =
    displayedPoints >= TICKET_COST &&
    rewards.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeader
            title="행운의 교통 룰렛"
            description="시민 참여로 모은 포인트를 사용해 보세요."
          />

          <Badge variant="warning">
            1회 {TICKET_COST}P
          </Badge>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="relative">
            <div
              className={[
                "flex size-64 items-center justify-center rounded-full border-8 border-surface shadow-floating",
                isPending
                  ? "animate-spin"
                  : "",
              ].join(" ")}
              style={{
                background:
                  "conic-gradient(" +
                  "#2563eb 0deg 90deg," +
                  "#f59e0b 90deg 180deg," +
                  "#10b981 180deg 270deg," +
                  "#ef4444 270deg 360deg)",
              }}
            >
              <div className="flex size-28 flex-col items-center justify-center rounded-full bg-surface shadow-card">
                <span className="text-xs text-muted">
                  보유 포인트
                </span>

                <strong className="mt-1 text-xl text-brand-text">
                  {displayedPoints.toLocaleString()}
                  P
                </strong>
              </div>
            </div>

            <div className="absolute left-1/2 top-[-8px] -translate-x-1/2">
              <div className="h-0 w-0 border-x-[14px] border-t-[24px] border-x-transparent border-t-danger" />
            </div>
          </div>
        </div>

        {state.message && (
          <ResultMessage
            state={state}
          />
        )}

        <form
          action={formAction}
          className="mt-6"
        >
          <Button
            type="submit"
            fullWidth
            disabled={
              isPending ||
              !canDraw
            }
          >
            {isPending
              ? "룰렛 추첨 중..."
              : canDraw
                ? "300P로 룰렛 돌리기"
                : "포인트가 부족합니다"}
          </Button>
        </form>

        <p className="mt-3 text-center text-xs leading-5 text-muted">
          추첨 버튼을 여러 번 누르지 마세요.
          포인트 차감과 보상 지급은 서버에서
          한 번에 처리됩니다.
        </p>
      </Card>

      <RewardList rewards={rewards} />
    </div>
  );
}

function ResultMessage({
  state,
}: {
  state: RewardActionState;
}) {
  if (
    state.status === "error" ||
    !state.result
  ) {
    return (
      <p
        role="alert"
        className="mt-6 rounded-control bg-danger-soft p-4 text-center text-sm text-danger"
      >
        {state.message}
      </p>
    );
  }

  return (
    <div
      role="status"
      className="mt-6 rounded-card border border-brand-line bg-brand-softer p-5 text-center"
    >
      <Badge variant="success">
        당첨
      </Badge>

      <h3 className="mt-3 text-xl font-bold text-main">
        {state.result.rewardName}
      </h3>

      {state.result.rewardDescription && (
        <p className="mt-2 text-sm text-muted">
          {
            state.result
              .rewardDescription
          }
        </p>
      )}

      {state.result.isSimulated && (
        <p className="mt-3 rounded-control bg-warning-soft p-3 text-xs leading-5 text-warning">
          프로토타입 보상입니다. 실제 쿠폰
          발급은 외부 쿠폰 시스템 연결이
          필요합니다.
        </p>
      )}
    </div>
  );
}

function RewardList({
  rewards,
}: {
  rewards: RewardOption[];
}) {
  return (
    <Card>
      <SectionHeader
        title="룰렛 보상"
        description="현재 추첨 가능한 보상 목록"
      />

      {rewards.length === 0 ? (
        <p className="mt-5 text-center text-sm text-muted">
          현재 받을 수 있는 보상이 없습니다.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {rewards.map((reward) => (
            <li
              key={reward.id}
              className="rounded-control bg-surface-muted p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm text-main">
                  {reward.name}
                </strong>

                <Badge
                  variant={
                    reward.rewardType ===
                    "points"
                      ? "brand"
                      : "warning"
                  }
                >
                  {formatRewardType(
                    reward.rewardType,
                  )}
                </Badge>
              </div>

              <p className="mt-2 text-xs leading-5 text-muted">
                {reward.description ??
                  "보상 설명 없음"}
              </p>

              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>
                  확률{" "}
                  {formatProbability(
                    reward.probability,
                  )}
                </span>

                <span>
                  {reward.stock === null
                    ? "재고 제한 없음"
                    : `재고 ${reward.stock}개`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function formatRewardType(
  type: RewardOption["rewardType"],
) {
  if (type === "points") {
    return "포인트";
  }

  if (type === "coupon") {
    return "쿠폰";
  }

  return "이용권";
}

function formatProbability(
  probability: number,
) {
  return `${(
    probability * 100
  ).toFixed(
    probability < 0.1 ? 1 : 0,
  )}%`;
}
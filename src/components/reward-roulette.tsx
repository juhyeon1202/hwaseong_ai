"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  drawReward,
  type RewardActionState,
  type RewardResult,
} from "@/app/(protected)/rewards/actions";
import {
  Badge,
  Button,
  Card,
  SectionHeader,
} from "@/components/ui";

// 룰렛 칸(시각적으로 동일 크기 5등분, 시계방향 배치).
// 실제 당첨 확률은 이 칸 크기와 무관하게 서버(draw_reward RPC)의
// 가중치 계산을 그대로 따르고, 여기서는 결과가 어느 칸에서
// 멈춰야 하는지 찾기 위한 이름→각도 매핑으로만 사용합니다.
const WHEEL_CENTER = 100;
const WHEEL_RADIUS = 96;
const WHEEL_LABEL_RADIUS = 62;
const WHEEL_BORDER_COLOR =
  "var(--color-line-strong)";

type WheelWedge = {
  rewardName: string;
  label: string;
  startAngle: number;
  endAngle: number;
  fill: string;
  textColor: string;
};

const WHEEL_WEDGES: WheelWedge[] = [
  {
    rewardName: "커피쿠폰",
    label: "커피",
    startAngle: 0,
    endAngle: 72,
    fill: "#ec7211",
    textColor: "#ffffff",
  },
  {
    rewardName: "100P",
    label: "100P",
    startAngle: 72,
    endAngle: 144,
    fill: "#ffffff",
    textColor: "#191f28",
  },
  {
    rewardName: "사탕쿠폰",
    label: "사탕",
    startAngle: 144,
    endAngle: 216,
    fill: "#2f6fed",
    textColor: "#ffffff",
  },
  {
    rewardName: "200P",
    label: "200P",
    startAngle: 216,
    endAngle: 288,
    fill: "#f3f4f6",
    textColor: "#191f28",
  },
  {
    rewardName: "300P",
    label: "300P",
    startAngle: 288,
    endAngle: 360,
    fill: "#e5e7eb",
    textColor: "#191f28",
  },
];

// 컴퍼스 각도(0=정각 위, 시계방향 증가)를 SVG 좌표로 변환합니다.
// 서버(Node)와 클라이언트(브라우저)의 삼각함수 계산이 마지막 몇
// 비트에서 미세하게 달라질 수 있어(예: 176.999999999...7 vs ...8),
// 반올림하지 않으면 SVG path 문자열이 달라져 하이드레이션
// 불일치가 발생합니다. 소수점 2자리로 고정해 방지합니다.
function roundCoordinate(
  value: number,
) {
  return (
    Math.round(value * 100) / 100
  );
}

function polarPoint(
  angleDeg: number,
  radius: number,
) {
  const rad = (angleDeg * Math.PI) / 180;

  return {
    x: roundCoordinate(
      WHEEL_CENTER +
        radius * Math.sin(rad),
    ),
    y: roundCoordinate(
      WHEEL_CENTER -
        radius * Math.cos(rad),
    ),
  };
}

function wedgePath(
  startAngle: number,
  endAngle: number,
) {
  const start = polarPoint(
    startAngle,
    WHEEL_RADIUS,
  );

  const end = polarPoint(
    endAngle,
    WHEEL_RADIUS,
  );

  const largeArc =
    endAngle - startAngle > 180
      ? 1
      : 0;

  return [
    `M ${WHEEL_CENTER} ${WHEEL_CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

const SPIN_EXTRA_TURNS_MIN = 4;
const SPIN_EXTRA_TURNS_RANGE = 3;
const SPIN_WEDGE_MARGIN_DEGREES = 10;
const SPIN_DURATION_MS = 3500;

// 당첨된 보상 이름에 해당하는 칸 범위 안에서(가장자리는 피해서)
// 무작위 정지 각도를 하나 고릅니다.
function pickStopAngle(
  wedge: WheelWedge,
) {
  const usableStart =
    wedge.startAngle +
    SPIN_WEDGE_MARGIN_DEGREES;

  const usableEnd =
    wedge.endAngle -
    SPIN_WEDGE_MARGIN_DEGREES;

  return (
    usableStart +
    Math.random() *
      (usableEnd - usableStart)
  );
}

// 포인터가 화면 맨 위(0도)에 고정돼 있으므로, 휠을 얼마나
// 더 돌려야 목표 칸이 포인터 위치에 오는지 계산합니다.
// 이전 회전값에서 이어서 여러 바퀴를 더 돌아 자연스럽게 감속하도록
// 누적 회전각을 그대로 늘려갑니다.
function computeNextRotation(
  currentRotation: number,
  targetAngle: number,
) {
  const currentMod =
    ((currentRotation % 360) + 360) %
    360;

  const requiredMod =
    ((360 - targetAngle) % 360 + 360) %
    360;

  const extraTurns =
    SPIN_EXTRA_TURNS_MIN +
    Math.floor(
      Math.random() *
        SPIN_EXTRA_TURNS_RANGE,
    );

  const forwardDelta =
    (requiredMod - currentMod + 360) %
    360;

  return (
    currentRotation +
    extraTurns * 360 +
    forwardDelta
  );
}

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

  const [rotation, setRotation] =
    useState(0);

  const [isSpinning, setIsSpinning] =
    useState(false);

  const [
    animatedDrawId,
    setAnimatedDrawId,
  ] = useState<string | null>(
    null,
  );

  const [
    visibleResult,
    setVisibleResult,
  ] =
    useState<RewardResult | null>(
      null,
    );

  const latestResult = state.result;

  // 새 추첨 결과가 도착하면(아직 애니메이션하지 않은 draw라면)
  // 해당 보상 칸으로 정지 각도를 계산해 회전을 시작합니다.
  useEffect(() => {
    if (
      !latestResult ||
      latestResult.drawId ===
        animatedDrawId
    ) {
      return;
    }

    const wedge = WHEEL_WEDGES.find(
      (candidate) =>
        candidate.rewardName ===
        latestResult.rewardName,
    );

    const targetAngle = wedge
      ? pickStopAngle(wedge)
      : 0;

    const startTimeoutId =
      window.setTimeout(() => {
        setRotation((current) =>
          computeNextRotation(
            current,
            targetAngle,
          ),
        );

        setIsSpinning(true);
        setAnimatedDrawId(
          latestResult.drawId,
        );
      }, 0);

    return () => {
      window.clearTimeout(
        startTimeoutId,
      );
    };
  }, [latestResult, animatedDrawId]);

  // 회전이 끝나면(멈춘 직후) 당첨 팝업을 띄웁니다.
  useEffect(() => {
    if (!isSpinning) {
      return;
    }

    const stopTimeoutId =
      window.setTimeout(() => {
        setIsSpinning(false);
        setVisibleResult(
          latestResult ?? null,
        );
      }, SPIN_DURATION_MS);

    return () => {
      window.clearTimeout(
        stopTimeoutId,
      );
    };
  }, [isSpinning, latestResult]);

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
          <div className="relative flex size-64 items-center justify-center">
            <div
              className="size-full overflow-hidden rounded-full border-8 border-surface shadow-floating"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning
                  ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.68, 0.14, 1)`
                  : "none",
              }}
            >
              <svg
                viewBox="0 0 200 200"
                className="size-full"
              >
                {WHEEL_WEDGES.map(
                  (wedge) => {
                    const labelPoint =
                      polarPoint(
                        (wedge.startAngle +
                          wedge.endAngle) /
                          2,
                        WHEEL_LABEL_RADIUS,
                      );

                    return (
                      <g
                        key={
                          wedge.rewardName
                        }
                      >
                        <path
                          d={wedgePath(
                            wedge.startAngle,
                            wedge.endAngle,
                          )}
                          fill={
                            wedge.fill
                          }
                          stroke={
                            WHEEL_BORDER_COLOR
                          }
                          strokeWidth={2}
                        />

                        <text
                          x={
                            labelPoint.x
                          }
                          y={
                            labelPoint.y
                          }
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="15"
                          fontWeight="700"
                          fill={
                            wedge.textColor
                          }
                        >
                          {wedge.label}
                        </text>
                      </g>
                    );
                  },
                )}
              </svg>
            </div>

            <div className="pointer-events-none absolute flex size-28 flex-col items-center justify-center rounded-full bg-surface shadow-card">
              <span className="text-xs text-muted">
                보유 포인트
              </span>

              <strong className="mt-1 text-xl text-brand-text">
                {displayedPoints.toLocaleString()}
                P
              </strong>
            </div>

            <div className="pointer-events-none absolute left-1/2 top-[-8px] -translate-x-1/2">
              <div className="h-0 w-0 border-x-[14px] border-t-[24px] border-x-transparent border-t-danger" />
            </div>
          </div>
        </div>

        {state.status === "error" &&
          state.message && (
            <p
              role="alert"
              className="mt-6 rounded-control bg-danger-soft p-4 text-center text-sm text-danger"
            >
              {state.message}
            </p>
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
              isSpinning ||
              !canDraw
            }
          >
            {isPending || isSpinning
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

      {visibleResult && (
        <RewardResultModal
          result={visibleResult}
          onClose={() =>
            setVisibleResult(null)
          }
        />
      )}
    </div>
  );
}

function RewardResultModal({
  result,
  onClose,
}: {
  result: RewardResult;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-result-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section className="animate-reward-pop w-full max-w-sm rounded-[22px] bg-white p-6 text-center shadow-2xl sm:p-7">
        <Badge variant="success">
          당첨
        </Badge>

        <h2
          id="reward-result-title"
          className="mt-4 text-2xl font-bold text-main"
        >
          {result.rewardName} 당첨!
        </h2>

        {result.isSimulated ? (
          <p className="mt-3 text-sm leading-6 text-secondary">
            프로토타입 데모용 예시
            경품입니다.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-secondary">
            {result.rewardPoints.toLocaleString()}
            P가 지급 완료되었습니다.
          </p>
        )}

        <Button
          type="button"
          fullWidth
          className="mt-6"
          onClick={onClose}
        >
          확인
        </Button>
      </section>
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
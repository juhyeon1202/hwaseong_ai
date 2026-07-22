import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import {
  RewardRoulette,
  type RewardOption,
} from "@/components/reward-roulette";
import {
  Badge,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "포인트 룰렛",
};

type RewardHistory = {
  id: string;
  ticket_cost: number;
  reward_points: number;
  created_at: string;
  reward_catalog:
    | {
        name: string;
        reward_type:
          | "points"
          | "coupon"
          | "ticket";
      }
    | {
        name: string;
        reward_type:
          | "points"
          | "coupon"
          | "ticket";
      }[]
    | null;
};

export default async function RewardsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    profileResult,
    rewardResult,
    historyResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single(),

    supabase
      .from("reward_catalog")
      .select(
        `
          id,
          name,
          description,
          reward_type,
          reward_value,
          probability,
          stock
        `,
      )
      .eq("is_active", true)
      .or(
        "stock.is.null,stock.gt.0",
      )
      .order("probability", {
        ascending: false,
      }),

    supabase
      .from("reward_draws")
      .select(
        `
          id,
          ticket_cost,
          reward_points,
          created_at,
          reward_catalog (
            name,
            reward_type
          )
        `,
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(10),
  ]);

  if (
    profileResult.error ||
    !profileResult.data
  ) {
    throw new Error(
      "포인트 정보를 불러오지 못했습니다.",
    );
  }

  const rewards: RewardOption[] =
    (rewardResult.data ?? []).map(
      (reward) => ({
        id: Number(reward.id),
        name: reward.name,
        description:
          reward.description,
        rewardType:
          reward.reward_type,
        rewardValue:
          reward.reward_value,
        probability: Number(
          reward.probability,
        ),
        stock: reward.stock,
      }),
    );

  const history =
    (historyResult.data as
      | RewardHistory[]
      | null) ?? [];

  return (
    <AppShell user={user}>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header>
          <Badge variant="warning">
            시민 참여 보상
          </Badge>

          <h1 className="mt-4 text-2xl font-bold text-main sm:text-3xl">
            포인트 룰렛
          </h1>

          <p className="mt-2 text-sm leading-6 text-secondary">
            출석과 시민 참여로 모은 포인트를
            사용해 보상을 받을 수 있습니다.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.75fr)]">
          <RewardRoulette
            points={
              profileResult.data.points
            }
            rewards={rewards}
          />

          <aside>
            <RewardHistoryCard
              history={history}
              hasError={Boolean(
                historyResult.error,
              )}
            />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function RewardHistoryCard({
  history,
  hasError,
}: {
  history: RewardHistory[];
  hasError: boolean;
}) {
  return (
    <Card>
      <SectionHeader
        title="최근 당첨 내역"
        description="최근 10회의 룰렛 결과"
      />

      {hasError ? (
        <p className="mt-5 text-sm text-danger">
          당첨 내역을 불러오지 못했습니다.
        </p>
      ) : history.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="당첨 내역이 없습니다"
            description="포인트를 모아 첫 룰렛에 참여해 보세요."
          />
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-line-light">
          {history.map((draw) => {
            const reward = Array.isArray(
              draw.reward_catalog,
            )
              ? draw.reward_catalog[0]
              : draw.reward_catalog;

            return (
              <li
                key={draw.id}
                className="py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-sm text-main">
                      {reward?.name ??
                        "보상 정보 없음"}
                    </strong>

                    <p className="mt-1 text-xs text-muted">
                      {formatDateTime(
                        draw.created_at,
                      )}
                    </p>
                  </div>

                  <Badge
                    variant={
                      draw.reward_points >
                      0
                        ? "success"
                        : "warning"
                    }
                  >
                    {draw.reward_points > 0
                      ? `+${draw.reward_points}P`
                      : "경품"}
                  </Badge>
                </div>

                <p className="mt-2 text-xs text-muted">
                  참여 비용{" "}
                  {draw.ticket_cost}P
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
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
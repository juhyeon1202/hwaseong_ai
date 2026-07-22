import type { Metadata } from "next";

import {
  toggleRouteVote,
} from "@/app/route-requests/actions";
import { AppShell } from "@/components/app-shell";
import {
  RouteRequestForm,
  type RouteStopOption,
} from "@/components/route-request-form";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "희망 노선",
};

type RouteRequestStatus =
  | "draft"
  | "open"
  | "reviewing"
  | "adopted"
  | "rejected"
  | "closed";

type RouteRequestSummary = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  status: RouteRequestStatus;
  vote_count: number;
  stop_count: number;
  created_at: string;
};

const statusLabels: Record<
  RouteRequestStatus,
  string
> = {
  draft: "작성 중",
  open: "투표 중",
  reviewing: "검토 중",
  adopted: "채택",
  rejected: "미채택",
  closed: "종료",
};

export default async function RouteRequestsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [
    routeResult,
    stopResult,
  ] = await Promise.all([
    supabase
      .from("route_request_summary")
      .select(
        `
          id,
          author_id,
          title,
          description,
          status,
          vote_count,
          stop_count,
          created_at
        `,
      )
      .neq("status", "draft")
      .order("vote_count", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .limit(30),

    supabase
      .from("transit_stops")
      .select(
        `
          id,
          name,
          stop_number,
          district_name
        `,
      )
      .order("name")
      .limit(500),
  ]);

  const routes =
    (routeResult.data as
      | RouteRequestSummary[]
      | null) ?? [];

  const stops: RouteStopOption[] =
    (stopResult.data ?? []).map(
      (stop) => ({
        id: Number(stop.id),
        name: stop.name,
        stopNumber:
          stop.stop_number,
        districtName:
          stop.district_name,
      }),
    );

  let votedRouteIds =
    new Set<string>();

  if (user) {
    const { data: votes } =
      await supabase
        .from(
          "route_request_votes",
        )
        .select(
          "route_request_id",
        )
        .eq("user_id", user.id);

    votedRouteIds = new Set(
      (votes ?? []).map(
        (vote) =>
          vote.route_request_id,
      ),
    );
  }

  return (
    <AppShell user={user}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="space-y-4">
          <SectionHeader
            title="시민 희망 노선"
            description="필요한 노선에 투표하고 화성시의 이동 수요를 알려 주세요."
          />

          {routeResult.error ? (
            <Card>
              <p className="text-sm text-danger">
                희망 노선을 불러오지
                못했습니다.
              </p>
            </Card>
          ) : routes.length === 0 ? (
            <EmptyState
              title="등록된 희망 노선이 없습니다"
              description="필요한 노선을 가장 먼저 제안해 보세요."
            />
          ) : (
            <ol className="space-y-3">
              {routes.map((route) => (
                <RouteRequestItem
                  key={route.id}
                  route={route}
                  userLoggedIn={
                    Boolean(user)
                  }
                  voted={votedRouteIds.has(
                    route.id,
                  )}
                />
              ))}
            </ol>
          )}
        </section>

        <aside>
          {user ? (
            stopResult.error ? (
              <Card>
                <p className="text-sm text-danger">
                  정류장 목록을 불러오지
                  못했습니다.
                </p>
              </Card>
            ) : stops.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">
                  등록된 정류장이 없어 희망
                  노선을 작성할 수 없습니다.
                </p>
              </Card>
            ) : (
              <RouteRequestForm
                stops={stops}
              />
            )
          ) : (
            <LoginRequiredCard />
          )}
        </aside>
      </div>
    </AppShell>
  );
}

type RouteRequestItemProps = {
  route: RouteRequestSummary;
  userLoggedIn: boolean;
  voted: boolean;
};

function RouteRequestItem({
  route,
  userLoggedIn,
  voted,
}: RouteRequestItemProps) {
  const votingAvailable =
    route.status === "open";

  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={route.status}
          />

          <span className="ml-auto text-xs text-muted">
            {formatDate(
              route.created_at,
            )}
          </span>
        </div>

        <h2 className="mt-4 text-lg font-bold text-main">
          {route.title}
        </h2>

        <p className="mt-2 line-clamp-3 text-sm leading-6 text-secondary">
          {route.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
          <span>
            정류장 {route.stop_count}개
          </span>

          <strong className="text-sm text-brand-text">
            시민 투표{" "}
            {route.vote_count}표
          </strong>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <ButtonLink
            href={`/route-requests/${route.id}`}
            variant="secondary"
            fullWidth
          >
            상세 보기
          </ButtonLink>

          {votingAvailable ? (
            userLoggedIn ? (
              <form
                action={toggleRouteVote}
              >
                <input
                  type="hidden"
                  name="routeRequestId"
                  value={route.id}
                />

                <Button
                  type="submit"
                  variant={
                    voted
                      ? "secondary"
                      : "primary"
                  }
                  fullWidth
                >
                  {voted
                    ? "투표 취소"
                    : "이 노선에 투표"}
                </Button>
              </form>
            ) : (
              <ButtonLink
                href="/auth?mode=login"
                fullWidth
              >
                로그인하고 투표
              </ButtonLink>
            )
          ) : (
            <div className="flex min-h-11 items-center justify-center rounded-control bg-surface-muted px-4 text-sm font-semibold text-muted">
              투표 종료
            </div>
          )}
        </div>
      </Card>
    </li>
  );
}

function LoginRequiredCard() {
  return (
    <Card>
      <Badge>로그인 필요</Badge>

      <h2 className="mt-4 text-lg font-bold text-main">
        필요한 노선을 제안해 보세요
      </h2>

      <p className="mt-2 text-sm leading-6 text-muted">
        로그인하면 희망 노선을 등록하고 다른
        시민의 제안에 투표할 수 있습니다.
      </p>

      <ButtonLink
        href="/auth?mode=login"
        fullWidth
        className="mt-5"
      >
        로그인
      </ButtonLink>
    </Card>
  );
}

type StatusBadgeProps = {
  status: RouteRequestStatus;
};

function StatusBadge({
  status,
}: StatusBadgeProps) {
  if (status === "adopted") {
    return (
      <Badge variant="success">
        {statusLabels[status]}
      </Badge>
    );
  }

  if (status === "reviewing") {
    return (
      <Badge variant="warning">
        {statusLabels[status]}
      </Badge>
    );
  }

  if (
    status === "rejected" ||
    status === "closed"
  ) {
    return (
      <Badge variant="info">
        {statusLabels[status]}
      </Badge>
    );
  }

  return (
    <Badge variant="brand">
      {statusLabels[status]}
    </Badge>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  ).format(new Date(value));
}
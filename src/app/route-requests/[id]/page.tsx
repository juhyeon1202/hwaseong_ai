import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  toggleRouteVote,
  updateRouteRequestStatus,
} from "@/app/route-requests/actions";
import type { RouteStopOption } from "@/components/route-stop-types";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  SectionHeader,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type RouteRequestPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RouteRequestStatus =
  | "draft"
  | "open"
  | "reviewing"
  | "adopted"
  | "rejected"
  | "closed";

type RouteRequest = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  status: RouteRequestStatus;
  post_id: string | null;
  created_at: string;
  updated_at: string;
  route_request_stops:
    | {
        stop_order: number;
        transit_stops:
          | {
              id: number;
              name: string;
              stop_number:
                | string
                | null;
              district_name:
                | string
                | null;
            }
          | {
              id: number;
              name: string;
              stop_number:
                | string
                | null;
              district_name:
                | string
                | null;
            }[]
          | null;
      }[]
    | null;
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

export async function generateMetadata({
  params,
}: RouteRequestPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `희망 노선 ${id}`,
  };
}

export default async function RouteRequestPage({
  params,
}: RouteRequestPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("route_requests")
    .select(
      `
        id,
        author_id,
        title,
        description,
        status,
        post_id,
        created_at,
        updated_at,
        route_request_stops (
          stop_order,
          transit_stops (
            id,
            name,
            stop_number,
            district_name
          )
        )
      `,
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const route =
    data as RouteRequest;

  const selectedStops =
    normalizeSelectedStops(route);

  const [
    voteCountResult,
    userVoteResult,
  ] = await Promise.all([
    supabase
      .from("route_request_votes")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("route_request_id", id),

    user
      ? supabase
          .from(
            "route_request_votes",
          )
          .select(
            "route_request_id",
          )
          .eq(
            "route_request_id",
            id,
          )
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),
  ]);

  const voteCount =
    voteCountResult.count ?? 0;

  const voted = Boolean(
    userVoteResult.data,
  );

  const canManage =
    user?.id === route.author_id ||
    user?.role === "admin";

  return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header>
          <Link
            href="/route-requests"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-text"
          >
            ← 희망 노선 목록
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge
              status={route.status}
            />

            <span className="text-xs text-muted">
              {formatDate(
                route.created_at,
              )}
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-main sm:text-3xl">
            {route.title}
          </h1>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-secondary">
            {route.description}
          </p>
        </header>

        <Card>
          <SectionHeader
            title="희망 정류장"
            description={`${selectedStops.length}개의 정류장이 선택되었습니다.`}
          />

          <ol className="mt-5 space-y-2">
            {selectedStops.map(
              (stop, index) => (
                <li
                  key={stop.id}
                  className="flex items-center gap-3 rounded-control bg-surface-muted p-3"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand text-xs font-bold text-on-brand">
                    {index + 1}
                  </span>

                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-main">
                      {stop.name}
                    </strong>

                    <span className="mt-1 block text-xs text-muted">
                      {[
                        stop.stopNumber,
                        stop.districtName,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        "상세 정보 없음"}
                    </span>
                  </div>
                </li>
              ),
            )}
          </ol>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted">
                시민 투표
              </p>

              <p className="mt-1 text-2xl font-bold text-brand-text">
                {voteCount}표
              </p>
            </div>

            {user ? (
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
                >
                  {voted
                    ? "투표 취소"
                    : "이 노선에 투표"}
                </Button>
              </form>
            ) : (
              <ButtonLink href="/auth?mode=login">
                로그인하고 투표
              </ButtonLink>
            )}
          </div>
        </Card>

        {user?.role === "admin" && (
          <Card>
            <SectionHeader
              title="관리자 상태 관리"
              description="검토 결과에 따라 진행 상태를 변경합니다."
            />

            <form
              action={updateRouteRequestStatus}
              className="mt-5 flex flex-col gap-2 sm:flex-row"
            >
              <input
                type="hidden"
                name="routeRequestId"
                value={route.id}
              />

              <select
                name="status"
                defaultValue={route.status}
                className="min-h-11 flex-1 rounded-control border border-line bg-surface px-3 text-sm text-main outline-none focus:border-brand"
              >
                <option value="open">
                  투표 중
                </option>

                <option value="reviewing">
                  검토 중
                </option>

                <option value="adopted">
                  채택
                </option>

                <option value="rejected">
                  미채택
                </option>

                <option value="closed">
                  종료
                </option>
              </select>

              <Button type="submit">
                상태 변경
              </Button>
            </form>
          </Card>
        )}

        {canManage &&
          route.post_id && (
            <Card>
              <SectionHeader
                title="노선 제안 수정·삭제"
                description="이 희망 노선의 원문 게시글에서 내용 수정, 정류장 변경, 삭제를 할 수 있습니다."
              />

              <ButtonLink
                href={`/community/${route.post_id}`}
                variant="secondary"
                fullWidth
                className="mt-5"
              >
                게시글에서 관리하기 →
              </ButtonLink>
            </Card>
          )}
      </div>
  );
}

function normalizeSelectedStops(
  route: RouteRequest,
): RouteStopOption[] {
  return (
    route.route_request_stops ?? []
  )
    .sort(
      (first, second) =>
        first.stop_order -
        second.stop_order,
    )
    .map((item) => {
      const stop = Array.isArray(
        item.transit_stops,
      )
        ? item.transit_stops[0]
        : item.transit_stops;

      return {
        id: Number(stop?.id),
        name:
          stop?.name ??
          "정류장 정보 없음",
        stopNumber:
          stop?.stop_number ?? null,
        districtName:
          stop?.district_name ?? null,
      };
    })
    .filter(
      (stop) =>
        Number.isInteger(stop.id) &&
        stop.id > 0,
    );
}

function StatusBadge({
  status,
}: {
  status: RouteRequestStatus;
}) {
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
      month: "long",
      day: "numeric",
    },
  ).format(new Date(value));
}
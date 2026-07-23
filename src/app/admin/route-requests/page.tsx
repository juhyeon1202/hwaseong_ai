import type { Metadata } from "next";
import Link from "next/link";

import {
  updateRouteRequestStatus,
} from "@/app/route-requests/actions";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "희망 노선 관리",
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
  vote_count: number;
  stop_count: number;
  created_at: string;
};

type Profile = {
  id: string;
  nickname: string;
};

type AdminRouteRequestsPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

const allowedStatuses =
  new Set<RouteRequestStatus>([
    "draft",
    "open",
    "reviewing",
    "adopted",
    "rejected",
    "closed",
  ]);

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

export default async function AdminRouteRequestsPage({
  searchParams,
}: AdminRouteRequestsPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const supabase = await createClient();

  const selectedStatus =
    params.status &&
    allowedStatuses.has(
      params.status as RouteRequestStatus,
    )
      ? (params.status as RouteRequestStatus)
      : null;

  let routeQuery = supabase
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
    .order("vote_count", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (selectedStatus) {
    routeQuery = routeQuery.eq(
      "status",
      selectedStatus,
    );
  }

  const [
    routesResult,
    openResult,
    reviewingResult,
    adoptedResult,
  ] = await Promise.all([
    routeQuery.limit(100),

    supabase
      .from("route_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "open"),

    supabase
      .from("route_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "reviewing"),

    supabase
      .from("route_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "adopted"),
  ]);

  const routes =
    (routesResult.data as
      | RouteRequest[]
      | null) ?? [];

  const authorIds = Array.from(
    new Set(
      routes.map(
        (route) => route.author_id,
      ),
    ),
  );

  let profiles: Profile[] = [];

  if (authorIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", authorIds);

    profiles =
      (data as Profile[] | null) ?? [];
  }

  const nicknameById = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.nickname,
    ]),
  );

  const counts = {
    open: openResult.count ?? 0,
    reviewing:
      reviewingResult.count ?? 0,
    adopted:
      adoptedResult.count ?? 0,
  };

  const hasError = Boolean(
    routesResult.error ||
      openResult.error ||
      reviewingResult.error ||
      adoptedResult.error,
  );

  return (
    <div className="space-y-8">
      <header>
        <Badge variant="info">
          관리자
        </Badge>

        <h1 className="mt-3 text-2xl font-bold text-main sm:text-3xl">
          시민 희망 노선 관리
        </h1>

        <p className="mt-2 text-sm leading-6 text-secondary">
          시민이 제안한 노선과 투표 결과를
          확인하고 검토 상태를 관리합니다.
        </p>
      </header>

      <section
        aria-label="희망 노선 현황"
        className="grid gap-3 sm:grid-cols-3"
      >
        <RouteStatCard
          label="투표 진행"
          count={counts.open}
          description="현재 시민 투표가 진행 중"
          variant="info"
        />

        <RouteStatCard
          label="검토 대기"
          count={counts.reviewing}
          description="관리자 검토가 필요한 제안"
          variant="warning"
        />

        <RouteStatCard
          label="채택 노선"
          count={counts.adopted}
          description="검토 후 채택된 시민 제안"
          variant="success"
        />
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="노선 제안 목록"
          description={
            selectedStatus
              ? `${statusLabels[selectedStatus]} 상태의 제안만 표시합니다.`
              : "모든 시민 노선 제안을 표시합니다."
          }
        />

        <StatusFilters
          selectedStatus={
            selectedStatus
          }
          counts={counts}
        />

        {hasError ? (
          <Card>
            <p
              role="alert"
              className="text-sm text-danger"
            >
              희망 노선 데이터를 불러오지
              못했습니다.
            </p>
          </Card>
        ) : routes.length === 0 ? (
          <EmptyState
            title="해당하는 희망 노선이 없습니다"
            description="선택한 상태에 등록된 노선 제안이 없습니다."
            action={
              selectedStatus ? (
                <Link
                  href="/admin/route-requests"
                  className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold text-secondary"
                >
                  전체 노선 보기
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ol className="space-y-4">
            {routes.map((route) => (
              <RouteRequestItem
                key={route.id}
                route={route}
                authorNickname={
                  nicknameById.get(
                    route.author_id,
                  ) ?? "사용자"
                }
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function StatusFilters({
  selectedStatus,
  counts,
}: {
  selectedStatus:
    | RouteRequestStatus
    | null;
  counts: {
    open: number;
    reviewing: number;
    adopted: number;
  };
}) {
  const filters = [
    {
      href:
        "/admin/route-requests",
      label: "전체",
      count: null,
      active:
        selectedStatus === null,
    },
    {
      href:
        "/admin/route-requests?status=open",
      label: "투표 중",
      count: counts.open,
      active:
        selectedStatus === "open",
    },
    {
      href:
        "/admin/route-requests?status=reviewing",
      label: "검토 중",
      count: counts.reviewing,
      active:
        selectedStatus ===
        "reviewing",
    },
    {
      href:
        "/admin/route-requests?status=adopted",
      label: "채택",
      count: counts.adopted,
      active:
        selectedStatus ===
        "adopted",
    },
    {
      href:
        "/admin/route-requests?status=rejected",
      label: "미채택",
      count: null,
      active:
        selectedStatus ===
        "rejected",
    },
    {
      href:
        "/admin/route-requests?status=closed",
      label: "종료",
      count: null,
      active:
        selectedStatus ===
        "closed",
    },
  ];

  return (
    <nav
      aria-label="희망 노선 상태 필터"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {filters.map((filter) => (
        <Link
          key={filter.href}
          href={filter.href}
          aria-current={
            filter.active
              ? "page"
              : undefined
          }
          className={[
            "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-pill border px-4 text-sm font-semibold",
            filter.active
              ? "border-info bg-info text-white"
              : "border-line bg-surface text-secondary hover:bg-info-soft",
          ].join(" ")}
        >
          {filter.label}

          {filter.count !== null && (
            <span
              className={[
                "rounded-pill px-2 py-0.5 text-xs",
                filter.active
                  ? "bg-white/20 text-white"
                  : "bg-surface-muted text-muted",
              ].join(" ")}
            >
              {filter.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

function RouteRequestItem({
  route,
  authorNickname,
}: {
  route: RouteRequest;
  authorNickname: string;
}) {
  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={route.status}
          />

          <span className="text-xs font-semibold text-secondary">
            {authorNickname}
          </span>

          <time className="ml-auto text-xs text-muted">
            {formatDate(
              route.created_at,
            )}
          </time>
        </div>

        <h2 className="mt-4 text-lg font-bold text-main">
          {route.title}
        </h2>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-secondary">
          {route.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-control bg-info-soft px-4 py-3">
            <p className="text-xs text-muted">
              시민 투표
            </p>

            <p className="mt-1 font-bold text-info">
              {route.vote_count.toLocaleString()}
              표
            </p>
          </div>

          <div className="rounded-control bg-surface-muted px-4 py-3">
            <p className="text-xs text-muted">
              정류장
            </p>

            <p className="mt-1 font-bold text-main">
              {route.stop_count}
              개
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t border-line-light pt-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <Link
            href={`/route-requests/${route.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold text-secondary hover:bg-surface-muted"
          >
            노선 상세 및 정류장 확인
          </Link>

          <form
            action={
              updateRouteRequestStatus
            }
            className="flex gap-2"
          >
            <input
              type="hidden"
              name="routeRequestId"
              value={route.id}
            />

            <select
              name="status"
              defaultValue={
                route.status
              }
              aria-label="희망 노선 상태"
              className="min-h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-sm text-main outline-none focus:border-info"
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

            <Button
              type="submit"
              className="shrink-0 bg-info hover:opacity-90"
            >
              저장
            </Button>
          </form>
        </div>
      </Card>
    </li>
  );
}

function RouteStatCard({
  label,
  count,
  description,
  variant,
}: {
  label: string;
  count: number;
  description: string;
  variant:
    | "info"
    | "warning"
    | "success";
}) {
  const styles = {
    info: {
      card:
        "border-info/30 bg-info-soft",
      value: "text-info",
    },
    warning: {
      card:
        "border-warning/30 bg-warning-soft",
      value: "text-warning",
    },
    success: {
      card:
        "border-success/30 bg-success-soft",
      value: "text-success",
    },
  };

  return (
    <Card
      className={styles[variant].card}
    >
      <p className="text-sm font-medium text-secondary">
        {label}
      </p>

      <p
        className={`mt-3 text-3xl font-bold ${styles[variant].value}`}
      >
        {count.toLocaleString()}
        <span className="ml-1 text-base">
          건
        </span>
      </p>

      <p className="mt-2 text-xs text-muted">
        {description}
      </p>
    </Card>
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
        채택
      </Badge>
    );
  }

  if (status === "reviewing") {
    return (
      <Badge variant="warning">
        검토 중
      </Badge>
    );
  }

  if (
    status === "rejected" ||
    status === "closed"
  ) {
    return (
      <Badge variant="danger">
        {statusLabels[status]}
      </Badge>
    );
  }

  return (
    <Badge variant="info">
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
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}
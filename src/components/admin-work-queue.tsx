import Link from "next/link";

import {
  Badge,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type WaitingInquiry = {
  id: string;
  title: string;
  created_at: string;
};

type ReviewingRoute = {
  id: string;
  title: string;
  vote_count: number;
  created_at: string;
};

type ReviewIncident = {
  id: number;
  kind:
    | "full_pass"
    | "dispatch_delay"
    | "transfer_failure";
  report_count: number;
  created_at: string;
  transit_stops:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

const reportLabels = {
  full_pass: "만차 통과",
  dispatch_delay: "배차 지연",
  transfer_failure: "환승 실패",
} as const;

export async function AdminWorkQueue() {
  await requireAdmin();

  const supabase = await createClient();

  const [
    inquiryResult,
    routeResult,
    incidentResult,
  ] = await Promise.all([
    supabase
      .from("inquiries")
      .select(
        `
          id,
          title,
          created_at
        `,
      )
      .eq("status", "waiting")
      .order("created_at", {
        ascending: true,
      })
      .limit(3),

    supabase
      .from("route_request_summary")
      .select(
        `
          id,
          title,
          vote_count,
          created_at
        `,
      )
      .eq("status", "reviewing")
      .order("vote_count", {
        ascending: false,
      })
      .limit(3),

    supabase
      .from("incidents")
      .select(
        `
          id,
          kind,
          report_count,
          created_at,
          transit_stops (
            name
          )
        `,
      )
      .eq("requires_review", true)
      .in("status", [
        "detected",
        "reviewing",
      ])
      .order("created_at", {
        ascending: true,
      })
      .limit(3),
  ]);

  const inquiries =
    (inquiryResult.data as
      | WaitingInquiry[]
      | null) ?? [];

  const routes =
    (routeResult.data as
      | ReviewingRoute[]
      | null) ?? [];

  const incidents =
    (incidentResult.data as
      | ReviewIncident[]
      | null) ?? [];

  const totalCount =
    inquiries.length +
    routes.length +
    incidents.length;

  const hasError = Boolean(
    inquiryResult.error ||
      routeResult.error ||
      incidentResult.error,
  );

  return (
    <Card>
      <SectionHeader
        title="관리자 업무 대기함"
        description="확인과 처리가 필요한 업무를 모아 표시합니다."
        action={
          totalCount > 0 ? (
            <Badge variant="warning">
              {totalCount}건 확인 필요
            </Badge>
          ) : (
            <Badge variant="success">
              처리 완료
            </Badge>
          )
        }
      />

      {hasError && (
        <p
          role="alert"
          className="mt-5 rounded-control bg-danger-soft p-3 text-sm text-danger"
        >
          일부 업무 데이터를 불러오지
          못했습니다.
        </p>
      )}

      {!hasError &&
      totalCount === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="대기 중인 업무가 없습니다"
            description="현재 확인이 필요한 문의, 희망 노선, 교통 사건이 없습니다."
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <QueueSection
            title="답변 대기 문의"
            count={inquiries.length}
            href="/admin/inquiries?status=waiting"
            linkLabel="문의 관리"
            variant="danger"
          >
            {inquiries.map(
              (inquiry) => (
                <QueueLink
                  key={inquiry.id}
                  href="/admin/inquiries?status=waiting"
                  title={inquiry.title}
                  description={formatWaitingTime(
                    inquiry.created_at,
                  )}
                />
              ),
            )}
          </QueueSection>

          <QueueSection
            title="검토 중 희망 노선"
            count={routes.length}
            href="/admin/route-requests?status=reviewing"
            linkLabel="노선 관리"
            variant="warning"
          >
            {routes.map((route) => (
              <QueueLink
                key={route.id}
                href={`/route-requests/${route.id}`}
                title={route.title}
                description={`시민 투표 ${route.vote_count.toLocaleString()}표`}
              />
            ))}
          </QueueSection>

          <QueueSection
            title="AI 감지 검토"
            count={incidents.length}
            href="/admin/incidents"
            linkLabel="사건 관리"
            variant="info"
          >
            {incidents.map(
              (incident) => {
                const stop =
                  Array.isArray(
                    incident.transit_stops,
                  )
                    ? incident
                        .transit_stops[0]
                    : incident.transit_stops;

                return (
                  <QueueLink
                    key={incident.id}
                    href={`/admin/incidents/${incident.id}`}
                    title={
                      stop?.name ??
                      "정류장 정보 없음"
                    }
                    description={`${
                      reportLabels[
                        incident.kind
                      ]
                    } · 신고 ${
                      incident.report_count
                    }건`}
                  />
                );
              },
            )}
          </QueueSection>
        </div>
      )}
    </Card>
  );
}

function QueueSection({
  title,
  count,
  href,
  linkLabel,
  variant,
  children,
}: {
  title: string;
  count: number;
  href: string;
  linkLabel: string;
  variant:
    | "danger"
    | "warning"
    | "info";
  children: React.ReactNode;
}) {
  const styles = {
    danger: {
      container:
        "border-danger/20 bg-danger-soft",
      count: "text-danger",
    },
    warning: {
      container:
        "border-warning/20 bg-warning-soft",
      count: "text-warning",
    },
    info: {
      container:
        "border-info/20 bg-info-soft",
      count: "text-info",
    },
  };

  return (
    <section
      className={[
        "rounded-card border p-4",
        styles[variant].container,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-main">
          {title}
        </h3>

        <strong
          className={[
            "text-lg",
            styles[variant].count,
          ].join(" ")}
        >
          {count}
        </strong>
      </div>

      {count === 0 ? (
        <p className="mt-4 rounded-control bg-white/60 p-3 text-center text-xs text-muted">
          대기 항목이 없습니다.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {children}
        </ul>
      )}

      <Link
        href={href}
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-control border border-line bg-surface px-3 text-xs font-semibold text-secondary hover:bg-white"
      >
        {linkLabel}
      </Link>
    </section>
  );
}

function QueueLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-control bg-white/70 p-3 transition-colors hover:bg-white"
      >
        <p className="truncate text-sm font-semibold text-main">
          {title}
        </p>

        <p className="mt-1 truncate text-xs text-muted">
          {description}
        </p>
      </Link>
    </li>
  );
}

function formatWaitingTime(
  createdAt: string,
) {
  const created =
    new Date(createdAt);

  const now = new Date();

  const difference =
    now.getTime() -
    created.getTime();

  const hours = Math.max(
    0,
    Math.floor(
      difference /
        (1000 * 60 * 60),
    ),
  );

  if (hours < 1) {
    return "1시간 이내 등록";
  }

  if (hours < 24) {
    return `${hours}시간 대기`;
  }

  const days = Math.floor(
    hours / 24,
  );

  return `${days}일 대기`;
}
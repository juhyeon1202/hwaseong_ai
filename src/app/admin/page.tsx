import type { Metadata } from "next";
import Link from "next/link";

import {
  respondToInquiry,
} from "@/app/(protected)/account-actions";

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
  title: "1:1 문의 관리",
};

type InquiryStatus =
  | "waiting"
  | "in_progress"
  | "completed";

type Inquiry = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: InquiryStatus;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  nickname: string;
};

type AdminInquiriesPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

const statusLabels: Record<
  InquiryStatus,
  string
> = {
  waiting: "답변 대기",
  in_progress: "확인 중",
  completed: "답변 완료",
};

const allowedStatuses =
  new Set<InquiryStatus>([
    "waiting",
    "in_progress",
    "completed",
  ]);

export default async function AdminInquiriesPage({
  searchParams,
}: AdminInquiriesPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const supabase = await createClient();

  const selectedStatus =
    params.status &&
    allowedStatuses.has(
      params.status as InquiryStatus,
    )
      ? (params.status as InquiryStatus)
      : null;

  let inquiryQuery = supabase
    .from("inquiries")
    .select(
      `
        id,
        user_id,
        title,
        content,
        status,
        admin_response,
        responded_at,
        created_at,
        updated_at
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (selectedStatus) {
    inquiryQuery = inquiryQuery.eq(
      "status",
      selectedStatus,
    );
  }

  const [
    inquiriesResult,
    waitingResult,
    progressResult,
    completedResult,
  ] = await Promise.all([
    inquiryQuery,

    supabase
      .from("inquiries")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "waiting"),

    supabase
      .from("inquiries")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "in_progress"),

    supabase
      .from("inquiries")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "completed"),
  ]);

  const inquiries =
    (inquiriesResult.data as
      | Inquiry[]
      | null) ?? [];

  const userIds = Array.from(
    new Set(
      inquiries.map(
        (inquiry) => inquiry.user_id,
      ),
    ),
  );

  let profiles: Profile[] = [];

  if (userIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", userIds);

    profiles =
      (data as Profile[] | null) ?? [];
  }

  const nicknameByUserId =
    new Map(
      profiles.map((profile) => [
        profile.id,
        profile.nickname,
      ]),
    );

  const counts = {
    all:
      (waitingResult.count ?? 0) +
      (progressResult.count ?? 0) +
      (completedResult.count ?? 0),
    waiting:
      waitingResult.count ?? 0,
    inProgress:
      progressResult.count ?? 0,
    completed:
      completedResult.count ?? 0,
  };

  const hasError = Boolean(
    inquiriesResult.error ||
      waitingResult.error ||
      progressResult.error ||
      completedResult.error,
  );

  return (
    <div className="space-y-8">
      <header>
        <Badge variant="info">
          관리자
        </Badge>

        <h1 className="mt-3 text-2xl font-bold text-main sm:text-3xl">
          1:1 문의 관리
        </h1>

        <p className="mt-2 text-sm leading-6 text-secondary">
          시민이 등록한 문의를 확인하고 처리
          상태와 답변을 관리합니다.
        </p>
      </header>

      <section
        aria-label="문의 처리 현황"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <InquiryStatCard
          label="전체 문의"
          count={counts.all}
          description="누적 등록 문의"
          variant="info"
        />

        <InquiryStatCard
          label="답변 대기"
          count={counts.waiting}
          description="아직 확인하지 않은 문의"
          variant="danger"
        />

        <InquiryStatCard
          label="확인 중"
          count={counts.inProgress}
          description="관리자가 처리 중인 문의"
          variant="warning"
        />

        <InquiryStatCard
          label="답변 완료"
          count={counts.completed}
          description="답변이 완료된 문의"
          variant="success"
        />
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="문의 목록"
          description={
            selectedStatus
              ? `${statusLabels[selectedStatus]} 문의만 표시합니다.`
              : "모든 문의를 최신순으로 표시합니다."
          }
        />

        <InquiryFilters
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
              문의 데이터를 불러오지
              못했습니다. 관리자 권한과
              Supabase 정책을 확인해 주세요.
            </p>
          </Card>
        ) : inquiries.length === 0 ? (
          <EmptyState
            title="해당하는 문의가 없습니다"
            description="선택한 상태에 등록된 문의가 없습니다."
            action={
              selectedStatus ? (
                <Link
                  href="/admin/inquiries"
                  className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold text-secondary"
                >
                  전체 문의 보기
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ol className="space-y-4">
            {inquiries.map(
              (inquiry) => (
                <InquiryItem
                  key={inquiry.id}
                  inquiry={inquiry}
                  nickname={
                    nicknameByUserId.get(
                      inquiry.user_id,
                    ) ?? "사용자"
                  }
                />
              ),
            )}
          </ol>
        )}
      </section>
    </div>
  );
}

function InquiryFilters({
  selectedStatus,
  counts,
}: {
  selectedStatus: InquiryStatus | null;
  counts: {
    all: number;
    waiting: number;
    inProgress: number;
    completed: number;
  };
}) {
  const filters = [
    {
      href: "/admin/inquiries",
      label: "전체",
      count: counts.all,
      active: selectedStatus === null,
    },
    {
      href:
        "/admin/inquiries?status=waiting",
      label: "답변 대기",
      count: counts.waiting,
      active:
        selectedStatus === "waiting",
    },
    {
      href:
        "/admin/inquiries?status=in_progress",
      label: "확인 중",
      count: counts.inProgress,
      active:
        selectedStatus ===
        "in_progress",
    },
    {
      href:
        "/admin/inquiries?status=completed",
      label: "답변 완료",
      count: counts.completed,
      active:
        selectedStatus ===
        "completed",
    },
  ];

  return (
    <nav
      aria-label="문의 상태 필터"
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
            "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-pill border px-4 text-sm font-semibold transition-colors",
            filter.active
              ? "border-info bg-info text-white"
              : "border-line bg-surface text-secondary hover:bg-info-soft",
          ].join(" ")}
        >
          {filter.label}

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
        </Link>
      ))}
    </nav>
  );
}

function InquiryItem({
  inquiry,
  nickname,
}: {
  inquiry: Inquiry;
  nickname: string;
}) {
  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={inquiry.status}
          />

          <span className="text-xs font-semibold text-secondary">
            {nickname}
          </span>

          <span className="ml-auto text-xs text-muted">
            {formatDateTime(
              inquiry.created_at,
            )}
          </span>
        </div>

        <h2 className="mt-4 text-lg font-bold text-main">
          {inquiry.title}
        </h2>

        <p className="mt-3 whitespace-pre-wrap rounded-control bg-surface-muted p-4 text-sm leading-6 text-secondary">
          {inquiry.content}
        </p>

        <form
          action={respondToInquiry}
          className="mt-5 space-y-4 border-t border-line-light pt-5"
        >
          <input
            type="hidden"
            name="inquiryId"
            value={inquiry.id}
          />

          <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
            <label>
              <span className="mb-2 block text-sm font-semibold text-main">
                처리 상태
              </span>

              <select
                name="status"
                defaultValue={
                  inquiry.status
                }
                className="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-main outline-none focus:border-info"
              >
                <option value="waiting">
                  답변 대기
                </option>

                <option value="in_progress">
                  확인 중
                </option>

                <option value="completed">
                  답변 완료
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-main">
                관리자 답변
              </span>

              <textarea
                name="response"
                rows={5}
                maxLength={3000}
                defaultValue={
                  inquiry.admin_response ??
                  ""
                }
                placeholder="시민에게 전달할 답변을 입력해 주세요."
                className="w-full resize-y rounded-control border border-line bg-surface px-3 py-3 text-sm leading-6 text-main outline-none placeholder:text-muted focus:border-info"
              />
            </label>
          </div>

          {inquiry.responded_at && (
            <p className="text-xs text-muted">
              최근 답변:{" "}
              {formatDateTime(
                inquiry.responded_at,
              )}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              className="w-full bg-info hover:opacity-90 sm:w-auto"
            >
              처리 상태 및 답변 저장
            </Button>
          </div>
        </form>
      </Card>
    </li>
  );
}

function InquiryStatCard({
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
    | "danger"
    | "warning"
    | "success";
}) {
  const styles = {
    info: {
      card: "border-info/30 bg-info-soft",
      value: "text-info",
    },
    danger: {
      card:
        "border-danger/30 bg-danger-soft",
      value: "text-danger",
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
  status: InquiryStatus;
}) {
  if (status === "completed") {
    return (
      <Badge variant="success">
        {statusLabels[status]}
      </Badge>
    );
  }

  if (status === "in_progress") {
    return (
      <Badge variant="warning">
        {statusLabels[status]}
      </Badge>
    );
  }

  return (
    <Badge variant="danger">
      {statusLabels[status]}
    </Badge>
  );
}

function formatDateTime(value: string) {
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
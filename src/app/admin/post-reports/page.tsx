import type { Metadata } from "next";
import Link from "next/link";

import { setPostVisibility } from "@/app/community/actions";

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
  title: "게시물 신고 관리",
};

const priorityThreshold = 3;

type ReportReason =
  | "spam"
  | "abuse"
  | "false_info"
  | "other";

type PostReportSummary = {
  post_id: string;
  title: string;
  author_id: string;
  is_hidden: boolean;
  post_created_at: string;
  report_count: number;
  latest_report_at: string;
};

type PostReport = {
  post_id: string;
  reason: ReportReason;
};

type Profile = {
  id: string;
  nickname: string;
};

const reasonLabels: Record<
  ReportReason,
  string
> = {
  spam: "스팸",
  abuse: "욕설/비방",
  false_info: "허위정보",
  other: "기타",
};

export default async function AdminPostReportsPage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("post_report_summary")
    .select(
      `
        post_id,
        title,
        author_id,
        is_hidden,
        post_created_at,
        report_count,
        latest_report_at
      `,
    )
    .order("report_count", {
      ascending: false,
    })
    .order("latest_report_at", {
      ascending: false,
    })
    .limit(50);

  const summaries =
    (data as
      | PostReportSummary[]
      | null) ?? [];

  const postIds = summaries.map(
    (summary) => summary.post_id,
  );

  let reasonBreakdown = new Map<
    string,
    Partial<
      Record<ReportReason, number>
    >
  >();

  let authorNicknames = new Map<
    string,
    string
  >();

  if (postIds.length > 0) {
    const [
      reportsResult,
      profilesResult,
    ] = await Promise.all([
      supabase
        .from("post_reports")
        .select("post_id, reason")
        .in("post_id", postIds),

      supabase
        .from("profiles")
        .select("id, nickname")
        .in(
          "id",
          Array.from(
            new Set(
              summaries.map(
                (summary) =>
                  summary.author_id,
              ),
            ),
          ),
        ),
    ]);

    const reports =
      (reportsResult.data as
        | PostReport[]
        | null) ?? [];

    reasonBreakdown = reports.reduce(
      (map, report) => {
        const counts =
          map.get(report.post_id) ??
          {};

        counts[report.reason] =
          (counts[report.reason] ??
            0) + 1;

        map.set(
          report.post_id,
          counts,
        );

        return map;
      },
      new Map<
        string,
        Partial<
          Record<
            ReportReason,
            number
          >
        >
      >(),
    );

    authorNicknames = new Map(
      (
        (profilesResult.data as
          | Profile[]
          | null) ?? []
      ).map((profile) => [
        profile.id,
        profile.nickname,
      ]),
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <Badge variant="danger">
          관리자
        </Badge>

        <h1 className="mt-3 text-2xl font-bold text-main sm:text-3xl">
          게시물 신고 관리
        </h1>

        <p className="mt-2 text-sm leading-6 text-secondary">
          시민 게시판 신고 접수 현황을
          확인하고 게시글 공개 여부를
          조정합니다. 정류장 원터치 신고와는
          별개 데이터입니다.
        </p>
      </header>

      <section className="space-y-4">
        <SectionHeader
          title="신고 접수된 게시글"
          description={`신고가 ${priorityThreshold}건 이상 누적되면 우선 검토가 필요합니다.`}
        />

        {error ? (
          <Card>
            <p
              role="alert"
              className="text-sm text-danger"
            >
              신고 데이터를 불러오지
              못했습니다.
            </p>
          </Card>
        ) : summaries.length === 0 ? (
          <EmptyState
            title="접수된 신고가 없습니다"
            description="게시판에 신고된 게시글이 없습니다."
          />
        ) : (
          <ol className="space-y-4">
            {summaries.map(
              (summary) => (
                <PostReportItem
                  key={
                    summary.post_id
                  }
                  summary={summary}
                  authorNickname={
                    authorNicknames.get(
                      summary.author_id,
                    ) ?? "사용자"
                  }
                  reasonCounts={
                    reasonBreakdown.get(
                      summary.post_id,
                    ) ?? {}
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

function PostReportItem({
  summary,
  authorNickname,
  reasonCounts,
}: {
  summary: PostReportSummary;
  authorNickname: string;
  reasonCounts: Partial<
    Record<ReportReason, number>
  >;
}) {
  const isPriority =
    summary.report_count >=
    priorityThreshold;

  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {isPriority && (
            <Badge variant="danger">
              우선 검토 필요
            </Badge>
          )}

          <Badge
            variant={
              summary.is_hidden
                ? "warning"
                : "info"
            }
          >
            {summary.is_hidden
              ? "비공개 처리됨"
              : "공개 중"}
          </Badge>

          <span className="text-xs font-semibold text-secondary">
            작성자 {authorNickname}
          </span>

          <span className="ml-auto text-xs text-muted">
            최근 신고{" "}
            {formatDateTime(
              summary.latest_report_at,
            )}
          </span>
        </div>

        <h2 className="mt-4 text-lg font-bold text-main">
          {summary.title}
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            누적 신고{" "}
            {summary.report_count}건
          </span>

          {(
            Object.keys(
              reasonCounts,
            ) as ReportReason[]
          ).map((reason) => (
            <span key={reason}>
              {reasonLabels[reason]}{" "}
              {reasonCounts[reason]}
              건
            </span>
          ))}
        </div>

        <div className="mt-5 grid gap-3 border-t border-line-light pt-5 sm:grid-cols-2">
          <Link
            href={`/community/${summary.post_id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold text-secondary hover:bg-surface-muted"
          >
            게시글 확인하기
          </Link>

          <form action={setPostVisibility}>
            <input
              type="hidden"
              name="postId"
              value={summary.post_id}
            />

            <input
              type="hidden"
              name="hidden"
              value={
                summary.is_hidden
                  ? "false"
                  : "true"
              }
            />

            <Button
              type="submit"
              variant={
                summary.is_hidden
                  ? "secondary"
                  : "danger"
              }
              fullWidth
            >
              {summary.is_hidden
                ? "게시글 공개 전환"
                : "게시글 숨기기"}
            </Button>
          </form>
        </div>
      </Card>
    </li>
  );
}

function formatDateTime(
  value: string,
) {
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

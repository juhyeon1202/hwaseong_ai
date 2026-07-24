import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  RouteVoteButton,
} from "@/components/route-vote-button";

import {
  CommentForm,
  EditableCommentContent,
} from "@/components/comment-panel";
import {
  PostManageModal,
} from "@/components/post-manage-modal";
import type {
  PostEditData,
} from "@/components/post-form";
import { ReportPostButton } from "@/components/report-post-button";
import type { RouteStopOption } from "@/components/route-stop-types";
import { RouteStopMap } from "@/components/route-stop-map";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  SectionHeader,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CommunityPostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PostCategory =
  | "route_request"
  | "route_suggestion"
  | "information"
  | "question";

type BusType =
  | "city"
  | "village"
  | "other";

type Post = {
  id: string;
  author_id: string;
  category: PostCategory;
  bus_type: BusType | null;
  title: string;
  content: string;
  view_count: number;
  created_at: string;
  updated_at: string;
};

type Comment = {
  id: string;
  author_id: string;
  content: string;
  is_secret: boolean;
  created_at: string;
  is_redacted: boolean;
};

const categoryLabels: Record<
  PostCategory,
  string
> = {
  route_request: "노선 요청",
  route_suggestion: "노선 제안",
  information: "교통 정보",
  question: "질문",
};

const busTypeLabels: Record<
  BusType,
  string
> = {
  city: "시내버스",
  village: "마을버스",
  other: "기타",
};

export async function generateMetadata({
  params,
}: CommunityPostPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `시민 게시글 ${id}`,
  };
}

export default async function CommunityPostPage({
  params,
}: CommunityPostPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createClient();

  await supabase.rpc(
    "increment_post_view",
    {
      p_post_id: id,
    },
  );

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
        id,
        author_id,
        category,
        bus_type,
        title,
        content,
        view_count,
        created_at,
        updated_at
      `,
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const post = data as Post;

  const { data: commentData } =
    await supabaseAdmin
      .from("post_comments")
      .select(
        `
          id,
          author_id,
          content,
          is_secret,
          created_at
        `,
      )
      .eq("post_id", id)
      .eq("is_hidden", false)
      .order("created_at", {
        ascending: true,
      });

  const comments = (
    (commentData as
      | Omit<Comment, "is_redacted">[]
      | null) ?? []
  ).map((comment): Comment => {
    const canReadSecret =
      !comment.is_secret ||
      user?.id === comment.author_id ||
      user?.id === post.author_id ||
      user?.role === "admin";

    return {
      ...comment,
      content: canReadSecret
        ? comment.content
        : "비밀로 등록된 댓글입니다.",
      is_redacted: !canReadSecret,
    };
  });

  const authorIds = [
    post.author_id,
    ...comments.map(
      (comment) =>
        comment.author_id,
    ),
  ];

  const { data: profiles } =
    await supabase
      .from("profiles")
      .select("id, nickname")
      .in(
        "id",
        [...new Set(authorIds)],
      );

  const nicknameMap = new Map(
    (profiles ?? []).map(
      (profile) => [
        profile.id,
        profile.nickname,
      ],
    ),
  );

  const canManagePost =
    user?.id === post.author_id ||
    user?.role === "admin";

  const isRouteSuggestion =
    post.category ===
    "route_suggestion";

  let routeStops: RouteStopOption[] =
    [];

  let routeRequestId: string | null =
    null;

  let voteCount = 0;
  let voted = false;

  if (isRouteSuggestion) {
    const { data: routeRequestRow } =
      await supabase
        .from("route_requests")
        .select(
          `
            id,
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
        .eq("post_id", post.id)
        .maybeSingle();

    if (routeRequestRow) {
      routeRequestId =
        routeRequestRow.id;

      routeStops = (
        routeRequestRow.route_request_stops ??
        []
      )
        .slice()
        .sort(
          (a, b) =>
            a.stop_order -
            b.stop_order,
        )
        .map((row) => {
          const stop = Array.isArray(
            row.transit_stops,
          )
            ? row.transit_stops[0]
            : row.transit_stops;

          if (!stop) {
            return null;
          }

          return {
            id: Number(stop.id),
            name: stop.name,
            stopNumber:
              stop.stop_number ??
              null,
            districtName:
              stop.district_name ??
              null,
          };
        })
        .filter(
          (
            stop,
          ): stop is RouteStopOption =>
            Boolean(stop),
        );

      const [
        voteCountResult,
        userVoteResult,
      ] = await Promise.all([
        supabase
          .from(
            "route_request_votes",
          )
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "route_request_id",
            routeRequestId,
          ),

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
                routeRequestId,
              )
              .eq(
                "user_id",
                user.id,
              )
              .maybeSingle()
          : Promise.resolve({
              data: null,
            }),
      ]);

      voteCount =
        voteCountResult.count ?? 0;

      voted = Boolean(
        userVoteResult.data,
      );
    }
  }

  let editableStops: RouteStopOption[] =
    [];

  if (
    canManagePost &&
    isRouteSuggestion
  ) {
    const { data: stopOptionRows } =
      await supabase
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
        .limit(500);

    editableStops = (
      stopOptionRows ?? []
    ).map((stop) => ({
      id: Number(stop.id),
      name: stop.name,
      stopNumber:
        stop.stop_number ?? null,
      districtName:
        stop.district_name ?? null,
    }));
  }

  const canReport =
    Boolean(user) &&
    user?.id !== post.author_id;

  let alreadyReported = false;

  if (canReport && user) {
    const { data: existingReport } =
      await supabase
        .from("post_reports")
        .select("id")
        .eq("post_id", post.id)
        .eq("reporter_id", user.id)
        .maybeSingle();

    alreadyReported = Boolean(
      existingReport,
    );
  }

  const editData: PostEditData = {
    id: post.id,
    category: post.category,
    busType:
      post.bus_type ?? "",
    title: post.title,
    content: post.content,
    routeStops,
  };

  return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <article>
          <Link
            href="/community"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-text"
          >
            ← 시민 게시판
          </Link>

          <Card className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">
                {categoryLabels[
                  post.category
                ]}
              </Badge>

              {post.bus_type && (
                <Badge variant="info">
                  {busTypeLabels[
                    post.bus_type
                  ]}
                </Badge>
              )}

              <div className="ml-auto flex flex-wrap items-center gap-2">
                {canManagePost && (
                  <PostManageModal
                    post={editData}
                    stops={editableStops}
                  />
                )}

                {canReport && (
                  <ReportPostButton
                    postId={post.id}
                    alreadyReported={alreadyReported}
                  />
                )}
              </div>
            </div>

            <h1 className="mt-5 text-2xl font-bold text-main sm:text-3xl">
              {post.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>
                {nicknameMap.get(
                  post.author_id,
                ) ?? "화성시민"}
              </span>

              <span>
                {formatDateTime(
                  post.created_at,
                )}
              </span>

              <span>
                조회 {post.view_count}
              </span>
            </div>

            <div className="mt-6 border-t border-line-light pt-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-secondary">
                {post.content}
              </p>
            </div>

            {isRouteSuggestion &&
              routeStops.length >
                0 && (
                <div className="mt-6 border-t border-line-light pt-6">
                  <RouteStopMap
                    stopIds={routeStops.map(
                      (stop) =>
                        stop.id,
                    )}
                    showPolyline
                  />
                </div>
              )}
          </Card>
        </article>

        {isRouteSuggestion &&
          routeRequestId && (
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
                  <RouteVoteButton
                    routeRequestId={routeRequestId}
                    voted={voted}
                  />
                ) : (
                  <ButtonLink href="/auth?mode=login">
                    로그인하고 투표
                  </ButtonLink>
                )}
              </div>
            </Card>
          )}

        <Card>
          <SectionHeader
            title={`댓글 ${comments.length}개`}
            description="시민들과 의견을 나눠보세요."
          />

          {comments.length === 0 ? (
            <p className="mt-5 rounded-control bg-surface-muted p-5 text-center text-sm text-muted">
              아직 작성된 댓글이 없습니다.
            </p>
          ) : (
            <ol className="mt-5 space-y-3">
              {comments.map(
                (comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    postId={post.id}
                    nickname={
                      nicknameMap.get(
                        comment.author_id,
                      ) ?? "화성시민"
                    }
                    canDelete={
                      !comment.is_redacted &&
                      (user?.id ===
                        comment.author_id ||
                      user?.role ===
                        "admin")
                    }
                  />
                ),
              )}
            </ol>
          )}

          <div className="mt-5 border-t border-line-light pt-5">
            {user ? (
              <CommentForm
                postId={post.id}
              />
            ) : (
              <div>
                <p className="text-center text-sm text-muted">
                  댓글을 작성하려면 로그인이
                  필요합니다.
                </p>

                <ButtonLink
                  href="/auth?mode=login"
                  fullWidth
                  className="mt-3"
                >
                  로그인
                </ButtonLink>
              </div>
            )}
          </div>
        </Card>
      </div>
  );
}

type CommentItemProps = {
  comment: Comment;
  postId: string;
  nickname: string;
  canDelete: boolean;
};

function CommentItem({
  comment,
  postId,
  nickname,
  canDelete,
}: CommentItemProps) {
  return (
    <li className="rounded-control bg-surface-muted p-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-sm text-main">
          {nickname}
        </strong>

        {comment.is_secret && (
          <Badge variant="warning">
            비밀댓글
          </Badge>
        )}

        <span className="ml-auto text-xs text-muted">
          {formatDateTime(
            comment.created_at,
          )}
        </span>
      </div>

      <EditableCommentContent
        commentId={comment.id}
        postId={postId}
        content={comment.content}
        canEdit={canDelete && !comment.is_redacted}
        canDelete={canDelete}
      />
    </li>
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

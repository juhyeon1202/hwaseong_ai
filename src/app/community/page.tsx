import type {
  Metadata,
} from "next";

import {
  CommunityBoard,
  type CommunityPostItem,
  type CommunityStopOption,
} from "@/components/community-board";
import {
  getCurrentUser,
} from "@/lib/auth";
import {
  createClient,
} from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "시민 게시판",
};

type PostRow = {
  id: string;
  author_id: string;
  category:
    | "route_request"
    | "route_suggestion"
    | "information"
    | "question";
  title: string;
  content: string;
  view_count: number;
  created_at: string;
};

type RouteRow = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  status: string;
  vote_count: number;
  stop_count: number;
  created_at: string;
};

type ProfileRow = {
  id: string;
  nickname: string;
};

type CommentRow = {
  post_id: string;
};

export default async function CommunityPage() {
  const user = await getCurrentUser();
  const supabase =
    await createClient();

  const [
    postResult,
    routeResult,
    stopResult,
    commentResult,
  ] = await Promise.all([
    supabase
      .from("posts")
      .select(
        `
          id,
          author_id,
          category,
          title,
          content,
          view_count,
          created_at
        `,
      )
      .eq("is_hidden", false)
      .in("category", [
        "information",
        "question",
      ])
      .order("created_at", {
        ascending: false,
      })
      .limit(30),

    supabase
      .from(
        "route_request_summary",
      )
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
      .limit(1000),

    supabase
      .from("post_comments")
      .select("post_id"),
  ]);

  const posts =
    (postResult.data as
      | PostRow[]
      | null) ?? [];

  const routes =
    (routeResult.data as
      | RouteRow[]
      | null) ?? [];

  const authorIds = Array.from(
    new Set([
      ...posts.map(
        (post) => post.author_id,
      ),
      ...routes.map(
        (route) =>
          route.author_id,
      ),
    ]),
  );

  let profiles: ProfileRow[] = [];

  if (authorIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", authorIds);

    profiles =
      (data as ProfileRow[] | null) ??
      [];
  }

  const nicknameById = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.nickname,
    ]),
  );

  const commentCountByPostId =
    new Map<string, number>();

  for (const comment of
    (commentResult.data as
      | CommentRow[]
      | null) ?? []) {
    const currentCount =
      commentCountByPostId.get(
        comment.post_id,
      ) ?? 0;

    commentCountByPostId.set(
      comment.post_id,
      currentCount + 1,
    );
  }

  const postItems: CommunityPostItem[] =
    posts.map((post) => ({
      id: post.id,
      itemType: "post",
      category:
        post.category === "question"
          ? "question"
          : "information",
      title: post.title,
      content: post.content,
      authorNickname:
        nicknameById.get(
          post.author_id,
        ) ?? "익명 시민",
      createdAt: post.created_at,
      viewCount: post.view_count,
      commentCount:
        commentCountByPostId.get(
          post.id,
        ) ?? 0,
      voteCount: 0,
      stopCount: 0,
    }));

  const routeItems: CommunityPostItem[] =
    routes.map((route) => ({
      id: route.id,
      itemType: "route",
      category:
        "route_suggestion",
      title: route.title,
      content: route.description,
      authorNickname:
        nicknameById.get(
          route.author_id,
        ) ?? "익명 시민",
      createdAt: route.created_at,
      viewCount: 0,
      commentCount: 0,
      voteCount: route.vote_count,
      stopCount: route.stop_count,
    }));

  const items = [
    ...postItems,
    ...routeItems,
  ].sort(
    (first, second) =>
      new Date(
        second.createdAt,
      ).getTime() -
      new Date(
        first.createdAt,
      ).getTime(),
  );

  const stops: CommunityStopOption[] =
    (stopResult.data ?? []).map(
      (stop) => ({
        id: Number(stop.id),
        name: String(stop.name),
        stopNumber:
          stop.stop_number
            ? String(
                stop.stop_number,
              )
            : null,
        districtName:
          stop.district_name
            ? String(
                stop.district_name,
              )
            : null,
      }),
    );

  return (
    <CommunityBoard
      items={items}
      stops={stops}
      loggedIn={Boolean(user)}
    />
  );
}

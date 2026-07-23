import type { Metadata } from "next";
import Link from "next/link";

import { PostForm } from "@/components/post-form";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "시민 게시판",
};

type CommunityPageProps = {
  searchParams: Promise<{
    category?: string;
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

const categories = [
  {
    value: "",
    label: "전체",
  },
  {
    value: "route_request",
    label: "노선 요청",
  },
  {
    value: "route_suggestion",
    label: "노선 제안",
  },
  {
    value: "information",
    label: "교통 정보",
  },
  {
    value: "question",
    label: "질문",
  },
] as const;

export default async function CommunityPage({
  searchParams,
}: CommunityPageProps) {
  const params = await searchParams;
  const selectedCategory =
    params.category ?? "";

  const validCategory =
    categories.some(
      (category) =>
        category.value ===
        selectedCategory,
    )
      ? selectedCategory
      : "";

  const user = await getCurrentUser();
  const supabase = await createClient();

  let postQuery = supabase
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
        created_at
      `,
    )
    .eq("is_hidden", false)
    .order("created_at", {
      ascending: false,
    })
    .limit(30);

  if (validCategory) {
    postQuery = postQuery.eq(
      "category",
      validCategory,
    );
  }

  const { data, error } =
    await postQuery;

  const posts =
    (data as Post[] | null) ?? [];

  return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="space-y-4">
          <SectionHeader
            title="시민 게시판"
            description="화성시 교통 정보와 의견을 함께 나눠요."
          />

          <CategoryTabs
            selectedCategory={
              validCategory
            }
          />

          {error ? (
            <Card>
              <p className="text-sm text-danger">
                게시글을 불러오지
                못했습니다.
              </p>
            </Card>
          ) : posts.length === 0 ? (
            <EmptyState
              title="등록된 게시글이 없습니다"
              description="첫 번째 교통 이야기를 작성해 보세요."
            />
          ) : (
            <ol className="space-y-3">
              {posts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                />
              ))}
            </ol>
          )}
        </section>

        <aside>
          {user ? (
            <PostForm />
          ) : (
            <LoginRequiredCard />
          )}
        </aside>
      </div>
  );
}

type CategoryTabsProps = {
  selectedCategory: string;
};

function CategoryTabs({
  selectedCategory,
}: CategoryTabsProps) {
  return (
    <nav
      aria-label="게시글 분류"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {categories.map((category) => {
        const selected =
          category.value ===
          selectedCategory;

        const href = category.value
          ? `/community?category=${category.value}`
          : "/community";

        return (
          <Link
            key={
              category.value || "all"
            }
            href={href}
            className={[
              "inline-flex min-h-10 shrink-0 items-center rounded-pill px-4 text-sm font-semibold",
              selected
                ? "bg-brand text-on-brand"
                : "border border-line bg-surface text-secondary",
            ].join(" ")}
          >
            {category.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PostItem({
  post,
}: {
  post: Post;
}) {
  return (
    <li>
      <Link
        href={`/community/${post.id}`}
        className="block rounded-card border border-line bg-surface p-5 shadow-card transition-transform active:scale-[0.99] md:hover:-translate-y-0.5"
      >
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

          <span className="ml-auto text-xs text-muted">
            {formatDate(
              post.created_at,
            )}
          </span>
        </div>

        <h2 className="mt-4 text-lg font-bold text-main">
          {post.title}
        </h2>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-secondary">
          {post.content}
        </p>

        <div className="mt-4 flex items-center justify-between gap-4 text-xs text-muted">
          <span>
            조회 {post.view_count}
          </span>

          <span className="font-semibold text-brand-text">
            자세히 보기 →
          </span>
        </div>
      </Link>
    </li>
  );
}

function LoginRequiredCard() {
  return (
    <Card>
      <Badge>로그인 필요</Badge>

      <h2 className="mt-4 text-lg font-bold text-main">
        시민들과 교통 이야기를
        나눠보세요
      </h2>

      <p className="mt-2 text-sm leading-6 text-muted">
        로그인하면 게시글과 댓글을 작성할
        수 있습니다.
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
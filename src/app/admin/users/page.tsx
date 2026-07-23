import type { Metadata } from "next";
import Link from "next/link";

import {
  updateUserRole,
} from "@/app/admin/users/actions";

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
  title: "회원 권한 관리",
};

type ProfileRole =
  | "citizen"
  | "admin";

type Profile = {
  id: string;
  nickname: string;
  role: ProfileRole;
  home_district: string | null;
  points: number;
  attendance_streak: number;
  created_at: string;
};

type AdminUsersPageProps = {
  searchParams: Promise<{
    role?: string;
    query?: string;
  }>;
};

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const currentAdmin =
    await requireAdmin();

  const params = await searchParams;
  const supabase = await createClient();

  const selectedRole =
    params.role === "admin" ||
    params.role === "citizen"
      ? params.role
      : null;

  const keyword =
    params.query
      ?.trim()
      .slice(0, 30) ?? "";

  let profileQuery = supabase
    .from("profiles")
    .select(
      `
        id,
        nickname,
        role,
        home_district,
        points,
        attendance_streak,
        created_at
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (selectedRole) {
    profileQuery =
      profileQuery.eq(
        "role",
        selectedRole,
      );
  }

  if (keyword) {
    profileQuery =
      profileQuery.ilike(
        "nickname",
        `%${keyword}%`,
      );
  }

  const [
    profilesResult,
    adminCountResult,
    citizenCountResult,
  ] = await Promise.all([
    profileQuery.limit(100),

    supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("role", "admin"),

    supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("role", "citizen"),
  ]);

  const profiles =
    (profilesResult.data as
      | Profile[]
      | null) ?? [];

  const adminCount =
    adminCountResult.count ?? 0;

  const citizenCount =
    citizenCountResult.count ?? 0;

  const totalCount =
    adminCount + citizenCount;

  const hasError = Boolean(
    profilesResult.error ||
      adminCountResult.error ||
      citizenCountResult.error,
  );

  return (
    <div className="space-y-8">
      <header>
        <Badge variant="info">
          최고 관리자 기능
        </Badge>

        <h1 className="mt-3 text-2xl font-bold text-main sm:text-3xl">
          회원 권한 관리
        </h1>

        <p className="mt-2 text-sm leading-6 text-secondary">
          가입한 회원을 확인하고 관리자
          권한을 부여하거나 회수합니다.
        </p>
      </header>

      <section
        aria-label="회원 현황"
        className="grid gap-3 sm:grid-cols-3"
      >
        <UserStatCard
          label="전체 회원"
          count={totalCount}
          description="가입 완료 프로필"
          variant="info"
        />

        <UserStatCard
          label="일반 사용자"
          count={citizenCount}
          description="시민 서비스 이용자"
          variant="brand"
        />

        <UserStatCard
          label="관리자"
          count={adminCount}
          description="관리 기능 접근 가능"
          variant="warning"
        />
      </section>

      <Card>
        <SectionHeader
          title="회원 검색"
          description="닉네임과 권한으로 회원을 찾을 수 있습니다."
        />

        <form
          action="/admin/users"
          method="get"
          className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]"
        >
          <input
            name="query"
            defaultValue={keyword}
            maxLength={30}
            placeholder="닉네임 검색"
            className={inputClassName}
          />

          <select
            name="role"
            defaultValue={
              selectedRole ?? ""
            }
            className={inputClassName}
          >
            <option value="">
              모든 권한
            </option>

            <option value="citizen">
              일반 사용자
            </option>

            <option value="admin">
              관리자
            </option>
          </select>

          <Button
            type="submit"
            className="bg-info hover:opacity-90"
          >
            검색
          </Button>
        </form>

        {(keyword ||
          selectedRole) && (
          <Link
            href="/admin/users"
            className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold text-info"
          >
            검색 조건 초기화
          </Link>
        )}
      </Card>

      <section className="space-y-4">
        <SectionHeader
          title="회원 목록"
          description={`${profiles.length}명의 회원을 표시합니다.`}
        />

        {hasError ? (
          <Card>
            <p
              role="alert"
              className="text-sm text-danger"
            >
              회원 정보를 불러오지
              못했습니다.
            </p>
          </Card>
        ) : profiles.length === 0 ? (
          <EmptyState
            title="검색된 회원이 없습니다"
            description="검색어 또는 권한 조건을 변경해 주세요."
          />
        ) : (
          <ol className="space-y-3">
            {profiles.map(
              (profile) => (
                <UserItem
                  key={profile.id}
                  profile={profile}
                  isCurrentAdmin={
                    profile.id ===
                    currentAdmin.id
                  }
                />
              ),
            )}
          </ol>
        )}
      </section>

      <Card className="border-warning/30 bg-warning-soft">
        <h2 className="font-bold text-main">
          관리자 권한 주의사항
        </h2>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-secondary">
          <li>
            · 관리자는 시민 신고와 AI 감지
            사건을 확인할 수 있습니다.
          </li>

          <li>
            · 관리자는 희망 노선 상태와 1:1
            문의 답변을 변경할 수 있습니다.
          </li>

          <li>
            · 관리자 권한은 신뢰할 수 있는
            운영자에게만 부여하세요.
          </li>

          <li>
            · 현재 로그인한 관리자는 자신의
            권한을 직접 해제할 수 없습니다.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function UserItem({
  profile,
  isCurrentAdmin,
}: {
  profile: Profile;
  isCurrentAdmin: boolean;
}) {
  return (
    <li>
      <Card>
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div
            className={[
              "flex size-12 shrink-0 items-center justify-center rounded-pill text-lg font-bold",
              profile.role === "admin"
                ? "bg-info text-white"
                : "bg-brand text-on-brand",
            ].join(" ")}
          >
            {profile.nickname
              .slice(0, 1)
              .toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-main">
                {profile.nickname}
              </h2>

              <Badge
                variant={
                  profile.role ===
                  "admin"
                    ? "info"
                    : "brand"
                }
              >
                {profile.role ===
                "admin"
                  ? "관리자"
                  : "일반 사용자"}
              </Badge>

              {isCurrentAdmin && (
                <Badge variant="success">
                  현재 계정
                </Badge>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>
                {profile.home_district ??
                  "거주지역 미설정"}
              </span>

              <span>
                {profile.points.toLocaleString()}
                P
              </span>

              <span>
                연속 출석{" "}
                {profile.attendance_streak}
                일
              </span>

              <span>
                가입{" "}
                {formatDate(
                  profile.created_at,
                )}
              </span>
            </div>
          </div>

          {isCurrentAdmin ? (
            <div className="rounded-control bg-success-soft px-4 py-3 text-center text-xs font-semibold text-success">
              본인 권한 변경 불가
            </div>
          ) : (
            <form
              action={updateUserRole}
              className="flex shrink-0 gap-2"
            >
              <input
                type="hidden"
                name="userId"
                value={profile.id}
              />

              <select
                name="role"
                defaultValue={
                  profile.role
                }
                aria-label={`${profile.nickname} 회원 권한`}
                className="min-h-11 rounded-control border border-line bg-surface px-3 text-sm text-main outline-none focus:border-info"
              >
                <option value="citizen">
                  일반 사용자
                </option>

                <option value="admin">
                  관리자
                </option>
              </select>

              <Button
                type="submit"
                className="shrink-0 bg-info hover:opacity-90"
              >
                저장
              </Button>
            </form>
          )}
        </div>
      </Card>
    </li>
  );
}

function UserStatCard({
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
    | "brand"
    | "warning";
}) {
  const styles = {
    info: {
      card:
        "border-info/30 bg-info-soft",
      value: "text-info",
    },
    brand: {
      card:
        "border-brand-line bg-brand-softer",
      value: "text-brand-text",
    },
    warning: {
      card:
        "border-warning/30 bg-warning-soft",
      value: "text-warning",
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
          명
        </span>
      </p>

      <p className="mt-2 text-xs text-muted">
        {description}
      </p>
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

const inputClassName = [
  "min-h-11 w-full rounded-control",
  "border border-line bg-surface",
  "px-3 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-info",
].join(" ");
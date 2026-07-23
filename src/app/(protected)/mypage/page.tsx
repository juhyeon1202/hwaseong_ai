import type { Metadata } from "next";

import { AttendanceCard } from "@/components/attendance-card";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ProfileSettingsForm,
} from "@/components/profile-settings-form";

export const metadata: Metadata = {
  title: "마이페이지",
};

type Profile = {
  nickname: string;
  role:
    | "citizen"
    | "admin";
  points: number;
  attendance_streak: number;
  last_attendance_date:
    | string
    | null;
  home_district:
    | string
    | null;
  created_at: string;
};

type PointLedger = {
  id: number;
  amount: number;
  reason: string;
  created_at: string;
};

const pointReasonLabels: Record<
  string,
  string
> = {
  attendance: "출석 보상",
  reward: "보상 지급",
  reward_draw: "룰렛 참여",
  admin_adjustment: "관리자 조정",
  referral: "추천인 보상",
};

export default async function MyPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    profileResult,
    attendanceResult,
    pointResult,
    journalCountResult,
    postCountResult,
    routeRequestCountResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `
          nickname,
          role,
          points,
          attendance_streak,
          last_attendance_date,
          home_district,
          created_at
        `,
      )
      .eq("id", user.id)
      .single(),

    supabase
      .from("attendance_logs")
      .select("attendance_date")
      .eq("user_id", user.id)
      .order("attendance_date", {
        ascending: false,
      })
      .limit(7),

    supabase
      .from("point_ledger")
      .select(
        `
          id,
          amount,
          reason,
          created_at
        `,
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(20),

    supabase
      .from("trip_journals")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id),

    supabase
      .from("posts")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("author_id", user.id),

    supabase
      .from("route_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("author_id", user.id),
  ]);

  if (
    profileResult.error ||
    !profileResult.data
  ) {
    throw new Error(
      "회원 정보를 불러오지 못했습니다.",
    );
  }

  const profile =
    profileResult.data as Profile;

  const attendanceDates =
    (attendanceResult.data ?? []).map(
      (attendance) =>
        attendance.attendance_date,
    );

  const pointHistory =
    (pointResult.data as
      | PointLedger[]
      | null) ?? [];

  const today = formatDateKey(
    new Date(),
  );

  const attendedToday =
    profile.last_attendance_date ===
      today ||
    attendanceDates.includes(today);

  return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <ProfileHeader
          profile={profile}
          email={user.email}
        />

        <ProfileSettingsForm
          currentNickname={
            profile.nickname
          }
          currentHomeDistrict={
            profile.home_district
          }
        />

        <Card>
          <SectionHeader
            title="내 서비스"
            description="저장한 정보와 문의 내역을 관리하세요."
          />

          <div className="mt-5 grid grid-cols-2 gap-2">
            <ButtonLink
              href="/favorites"
              variant="secondary"
              fullWidth
            >
              즐겨찾기
            </ButtonLink>

            <ButtonLink
              href="/inquiries"
              variant="secondary"
              fullWidth
            >
              1:1 문의
            </ButtonLink>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
          <div className="space-y-6">
            <AttendanceCard
              attendedToday={
                attendedToday
              }
              currentStreak={
                profile.attendance_streak
              }
              attendanceDates={
                attendanceDates
              }
            />

            <ActivitySummary
              journalCount={
                journalCountResult.count ??
                0
              }
              postCount={
                postCountResult.count ?? 0
              }
              routeRequestCount={
                routeRequestCountResult.count ??
                0
              }
            />
          </div>

          <aside className="space-y-6">
            <PointCard
              points={profile.points}
            />

            <PointHistory
              pointHistory={
                pointHistory
              }
              hasError={Boolean(
                pointResult.error,
              )}
            />
          </aside>
        </div>
      </div>
  );
}

type ProfileHeaderProps = {
  profile: Profile;
  email: string | null;
};

function ProfileHeader({
  profile,
  email,
}: ProfileHeaderProps) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-pill bg-brand text-2xl font-bold text-on-brand">
          {profile.nickname
            .slice(0, 1)
            .toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-main">
              {profile.nickname}
            </h1>

            <Badge
              variant={
                profile.role === "admin"
                  ? "warning"
                  : "brand"
              }
            >
              {profile.role === "admin"
                ? "관리자"
                : "시민"}
            </Badge>
          </div>

          <p className="mt-1 truncate text-sm text-muted">
            {email ??
              "이메일 정보 없음"}
          </p>

          <p className="mt-1 text-xs text-muted">
            {profile.home_district ??
              "거주 지역 미설정"}
            {" · "}
            {formatMemberDate(
              profile.created_at,
            )}
            부터 참여
          </p>
        </div>
      </div>
    </Card>
  );
}

function PointCard({
  points,
}: {
  points: number;
}) {
  return (
    <Card className="border-brand-line bg-brand-softer">
      <p className="text-sm text-muted">
        보유 포인트
      </p>

      <p className="mt-2 text-3xl font-bold text-brand-text">
        {points.toLocaleString()}P
      </p>

      <p className="mt-3 text-xs leading-5 text-muted">
        출석과 시민 참여로 포인트를 모을
        수 있습니다.
      </p>

      <ButtonLink
        href="/rewards"
        fullWidth
        className="mt-5"
      >
        보상 확인
      </ButtonLink>
    </Card>
  );
}

type ActivitySummaryProps = {
  journalCount: number;
  postCount: number;
  routeRequestCount: number;
};

function ActivitySummary({
  journalCount,
  postCount,
  routeRequestCount,
}: ActivitySummaryProps) {
  const activities = [
    {
      href: "/journal",
      label: "교통일지",
      count: journalCount,
    },
    {
      href: "/community",
      label: "작성 게시글",
      count: postCount,
    },
    {
      href: "/route-requests",
      label: "희망 노선",
      count: routeRequestCount,
    },
  ];

  return (
    <Card>
      <SectionHeader
        title="나의 참여"
        description="지금까지 기록한 시민 참여 활동입니다."
      />

      <div className="mt-5 grid grid-cols-3 gap-2">
        {activities.map(
          (activity) => (
            <a
              key={activity.href}
              href={activity.href}
              className="rounded-control bg-surface-muted p-4 text-center"
            >
              <strong className="block text-xl text-main">
                {activity.count}
              </strong>

              <span className="mt-1 block text-xs text-muted">
                {activity.label}
              </span>
            </a>
          ),
        )}
      </div>
    </Card>
  );
}

type PointHistoryProps = {
  pointHistory: PointLedger[];
  hasError: boolean;
};

function PointHistory({
  pointHistory,
  hasError,
}: PointHistoryProps) {
  return (
    <Card>
      <SectionHeader
        title="포인트 내역"
        description="최근 포인트 적립과 사용 기록"
      />

      {hasError ? (
        <p className="mt-5 text-sm text-danger">
          포인트 내역을 불러오지 못했습니다.
        </p>
      ) : pointHistory.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="포인트 내역이 없습니다"
            description="출석 체크로 첫 포인트를 받아보세요."
          />
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-line-light">
          {pointHistory.map(
            (history) => (
              <li
                key={history.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-semibold text-main">
                    {pointReasonLabels[
                      history.reason
                    ] ??
                      history.reason}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(
                      history.created_at,
                    )}
                  </p>
                </div>

                <strong
                  className={
                    history.amount > 0
                      ? "text-success"
                      : "text-danger"
                  }
                >
                  {history.amount > 0
                    ? "+"
                    : ""}
                  {history.amount.toLocaleString()}
                  P
                </strong>
              </li>
            ),
          )}
        </ul>
      )}
    </Card>
  );
}

function formatDateKey(
  date: Date,
) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

function formatMemberDate(value: string) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "long",
    },
  ).format(new Date(value));
}
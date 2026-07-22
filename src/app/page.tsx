import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import {
  Badge,
  ButtonLink,
  Card,
  ProgressBar,
  SectionHeader,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

const districtRanking = [
  {
    rank: 1,
    name: "동탄1동",
    participation: 72,
  },
  {
    rank: 2,
    name: "동탄2동",
    participation: 61,
  },
  {
    rank: 3,
    name: "병점2동",
    participation: 55,
  },
] as const;

const quickActions = [
  {
    href: "/journal",
    title: "기록하기",
    description: "오늘의 이동 경험 기록",
    icon: "✎",
    variant: "brand",
  },
  {
    href: "/route",
    title: "길찾기",
    description: "대중교통 추천 경로",
    icon: "↗",
    variant: "info",
  },
  {
    href: "/rewards",
    title: "룰렛",
    description: "참여 포인트 보상",
    icon: "◎",
    variant: "warning",
  },
] as const;

const markerData = [
  {
    label: "동탄1동",
    value: 72,
    position:
      "left-[13%] top-[25%] sm:left-[22%]",
    active: true,
  },
  {
    label: "병점2동",
    value: 55,
    position:
      "right-[10%] top-[38%] sm:right-[20%]",
    active: false,
  },
  {
    label: "동탄2동",
    value: 61,
    position:
      "bottom-[25%] left-[38%] sm:left-[45%]",
    active: false,
  },
] as const;

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <HeroSection />

          <ParticipationMap />

          <QuickActions />
        </div>

        <aside className="space-y-6">
          <AccountCard user={user} />

          <RankingCard />

          <IncidentCard />
        </aside>
      </div>
    </AppShell>
  );
}

function HeroSection() {
  return (
    <section>
      <Badge>실시간 시민 참여</Badge>

      <h1 className="mt-4 text-2xl font-bold leading-tight text-main sm:text-3xl">
        우리 동네 교통 문제를
        <br />
        함께 기록하고 개선해요
      </h1>

      <p className="mt-3 max-w-xl text-sm leading-6 text-secondary sm:text-base sm:leading-7">
        버스를 타지 못한 순간과 이동 중 불편을
        익명으로 남기면, AI가 지역 교통 문제를
        분석하고 대응 방안을 제안합니다.
      </p>
    </section>
  );
}

function ParticipationMap() {
  return (
    <Card
      padded={false}
      className="overflow-hidden"
    >
      <div className="relative min-h-[360px] overflow-hidden bg-info-soft">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute left-[8%] top-[12%] h-[75%] w-px rotate-12 bg-line" />
          <div className="absolute left-[30%] top-[5%] h-[90%] w-px -rotate-12 bg-line" />
          <div className="absolute right-[25%] top-[5%] h-[90%] w-px rotate-6 bg-line" />
          <div className="absolute left-[5%] top-[30%] h-px w-[90%] -rotate-6 bg-line" />
          <div className="absolute left-[5%] top-[60%] h-px w-[90%] rotate-3 bg-line" />
        </div>

        <div className="absolute left-4 top-4 rounded-control bg-surface/95 px-4 py-3 shadow-card">
          <p className="text-xs text-muted">
            화성시 실시간 참여
          </p>

          <p className="mt-1 text-lg font-bold text-main">
            오늘 128건
          </p>
        </div>

        <div className="absolute right-4 top-4">
          <Badge variant="info">
            지도 API 연결 예정
          </Badge>
        </div>

        {markerData.map((marker) => (
          <MapMarker
            key={marker.label}
            {...marker}
          />
        ))}

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-card bg-surface/95 p-4 shadow-floating backdrop-blur sm:left-auto sm:w-80">
          <div className="min-w-0">
            <p className="text-xs text-muted">
              내 주변 정류장
            </p>

            <p className="mt-1 truncate font-bold text-main">
              병점역 후문
            </p>

            <p className="mt-1 text-xs font-medium text-danger">
              최근 10분 만차 통과 7건
            </p>
          </div>

          <ButtonLink
            href="/report"
            className="shrink-0"
          >
            익명 신고
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

type MapMarkerProps = {
  label: string;
  value: number;
  position: string;
  active: boolean;
};

function MapMarker({
  label,
  value,
  position,
  active,
}: MapMarkerProps) {
  return (
    <div
      className={`absolute ${position} flex flex-col items-center`}
    >
      <div
        className={[
          "rounded-control px-3 py-2 text-center shadow-card",
          active
            ? "bg-brand text-on-brand"
            : "bg-surface text-main",
        ].join(" ")}
      >
        <p className="text-xs font-semibold">
          {label}
        </p>

        <p className="mt-0.5 text-sm font-bold">
          {value}%
        </p>
      </div>

      <span
        className={[
          "-mt-1 size-3 rotate-45",
          active
            ? "bg-brand"
            : "bg-surface",
        ].join(" ")}
      />
    </div>
  );
}

function QuickActions() {
  return (
    <section className="space-y-4">
      <SectionHeader
        title="빠른 실행"
        description="자주 사용하는 기능을 바로 시작하세요."
      />

      <div className="grid grid-cols-3 gap-3">
        {quickActions.map((action) => (
          <QuickAction
            key={action.href}
            {...action}
          />
        ))}
      </div>
    </section>
  );
}

type QuickActionProps = {
  href: string;
  title: string;
  description: string;
  icon: string;
  variant: "brand" | "info" | "warning";
};

function QuickAction({
  href,
  title,
  description,
  icon,
  variant,
}: QuickActionProps) {
  const iconColors = {
    brand:
      "bg-brand-soft text-brand-text",
    info:
      "bg-info-soft text-info",
    warning:
      "bg-warning-soft text-warning",
  };

  return (
    <Link
      href={href}
      className="rounded-card border border-line bg-surface p-4 transition-transform active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-card"
    >
      <span
        className={`flex size-10 items-center justify-center rounded-control text-lg font-bold ${iconColors[variant]}`}
      >
        {icon}
      </span>

      <strong className="mt-4 block text-sm text-main">
        {title}
      </strong>

      <span className="mt-1 hidden text-xs leading-5 text-muted sm:block">
        {description}
      </span>
    </Link>
  );
}

type AccountCardProps = {
  user: Awaited<
    ReturnType<typeof getCurrentUser>
  >;
};

function AccountCard({
  user,
}: AccountCardProps) {
  if (user) {
    return (
      <Card>
        <p className="text-sm text-muted">
          안녕하세요
        </p>

        <h2 className="mt-1 text-xl font-bold text-main">
          {user.nickname}님
        </h2>

        <div className="mt-5 rounded-control bg-brand-softer p-4">
          <p className="text-xs text-muted">
            보유 포인트
          </p>

          <p className="mt-1 text-xl font-bold text-brand-text">
            {user.points.toLocaleString()}P
          </p>
        </div>

        <ButtonLink
          href={
            user.role === "admin"
              ? "/admin"
              : "/mypage"
          }
          fullWidth
          className="mt-4"
        >
          {user.role === "admin"
            ? "관리자 대시보드"
            : "마이페이지"}
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card>
      <Badge>계정</Badge>

      <h2 className="mt-4 text-lg font-bold text-main">
        내 교통일지를 시작해 보세요
      </h2>

      <p className="mt-2 text-sm leading-6 text-muted">
        로그인하면 이동 기록, 참여 포인트,
        즐겨찾기를 사용할 수 있습니다.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <ButtonLink
          href="/auth?mode=login"
          fullWidth
        >
          로그인
        </ButtonLink>

        <ButtonLink
          href="/auth?mode=signup"
          variant="secondary"
          fullWidth
        >
          회원가입
        </ButtonLink>
      </div>

      <Link
        href="/auth?mode=recover"
        className="mt-4 block text-center text-xs text-muted underline underline-offset-4"
      >
        비밀번호를 잊으셨나요?
      </Link>
    </Card>
  );
}

function RankingCard() {
  return (
    <Card>
      <SectionHeader
        title="실시간 동네 순위"
        description="최근 시민 참여율 기준"
        action={
          <Link
            href="/ranking"
            className="text-xs font-semibold text-brand-text"
          >
            전체 보기
          </Link>
        }
      />

      <ol className="mt-5 space-y-4">
        {districtRanking.map((district) => (
          <li
            key={district.name}
            className="grid grid-cols-[28px_1fr_42px] items-center gap-3"
          >
            <span
              className={[
                "flex size-7 items-center justify-center rounded-pill text-xs font-bold",
                district.rank === 1
                  ? "bg-brand text-on-brand"
                  : "bg-surface-muted text-secondary",
              ].join(" ")}
            >
              {district.rank}
            </span>

            <div>
              <p className="mb-2 text-sm font-semibold text-main">
                {district.name}
              </p>

              <ProgressBar
                value={district.participation}
              />
            </div>

            <strong className="text-right text-sm text-brand-text">
              {district.participation}%
            </strong>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function IncidentCard() {
  return (
    <Card className="border-brand-line bg-brand-softer">
      <Badge variant="danger">
        AI 상황 감지
      </Badge>

      <h2 className="mt-4 font-bold text-main">
        병점역 후문 혼잡 감지
      </h2>

      <p className="mt-2 text-sm leading-6 text-secondary">
        최근 10분간 만차 통과 신고가 증가하고
        있습니다.
      </p>

      <Link
        href="/incidents"
        className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-text"
      >
        우회 안내 확인 →
      </Link>
    </Card>
  );
}
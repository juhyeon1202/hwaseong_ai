import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import {
  KakaoMap,
  type MapMarkerData,
} from "@/components/kakao-map";
import {
  ButtonLink,
  Card,
  ProgressBar,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import {
  getHomeDistrict,
  getParticipationRanking,
  type ParticipationRanking,
} from "@/lib/participation";

const districtCoordinates: Record<
  string,
  {
    latitude: number;
    longitude: number;
  }
> = {
  동탄1동: {
    latitude: 37.2069,
    longitude: 127.0727,
  },
  동탄2동: {
    latitude: 37.1981,
    longitude: 127.0705,
  },
  병점1동: {
    latitude: 37.2074,
    longitude: 127.0346,
  },
  병점2동: {
    latitude: 37.2074,
    longitude: 127.0405,
  },
  봉담읍: {
    latitude: 37.2201,
    longitude: 126.9498,
  },
  진안동: {
    latitude: 37.2138,
    longitude: 127.0404,
  },
  향남읍: {
    latitude: 37.1324,
    longitude: 126.9202,
  },
};

const quickActions = [
  {
    href: "/journal",
    label: "기록하기",
    description: "오늘의 이동 기록",
    color:
      "border-brand bg-brand text-white",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
        <path d="m14.5 6.5 3 3" />
      </svg>
    ),
  },
  {
    href: "/route",
    label: "길찾기",
    description: "대중교통 추천 경로",
    color:
      "border-info/25 bg-white text-info",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    href: "/rewards",
    label: "룰렛",
    description: "참여 포인트 보상",
    color:
      "border-info/25 bg-white text-info",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4v16M4 12h16M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
] as const;

export default async function HomePage() {
  const user = await getCurrentUser();

  const [ranking, homeDistrict] =
    await Promise.all([
      getParticipationRanking(),
      getHomeDistrict(user?.id ?? null),
    ]);

  const normalizedRanking = ranking;

  const myDistrictName =
    homeDistrict ?? "병점2동";

  const myRanking =
    normalizedRanking.find(
      (item) =>
        item.districtName ===
        myDistrictName,
    ) ?? normalizedRanking[2] ?? null;

  const mapMarkers =
    createMapMarkers(normalizedRanking);

  return (
    <AppShell user={user}>
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-4 md:mb-5">
          <p className="text-sm font-semibold text-secondary">
            우리 동네 참여율 지도
          </p>
        </header>

        <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div className="grid lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.7fr)]">
            <ParticipationMap
              markers={mapMarkers}
              ranking={normalizedRanking}
            />

            <div className="flex flex-col gap-4 border-t border-line-light p-4 sm:p-5 lg:border-l lg:border-t-0">
              <MyDistrictCard
                ranking={myRanking}
                districtName={myDistrictName}
                allRanking={normalizedRanking}
              />

              <QuickActions />

              <RankingPreview
                ranking={normalizedRanking.slice(
                  0,
                  3,
                )}
                homeDistrict={myDistrictName}
              />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <OneTouchReportCard />

          <AiInsightCard />
        </section>
      </div>
    </AppShell>
  );
}

type ParticipationMapProps = {
  markers: MapMarkerData[];
  ranking: ParticipationRanking[];
};

function ParticipationMap({
  markers,
  ranking,
}: ParticipationMapProps) {
  return (
    <div className="relative min-h-[340px] bg-[#eef2f6] sm:min-h-[440px] lg:min-h-[560px]">
      <KakaoMap
        center={{
          latitude: 37.1995,
          longitude: 127.0645,
        }}
        markers={markers}
        level={8}
        height="100%"
        className="absolute inset-0"
      />

      <div className="pointer-events-none absolute left-3 top-3 rounded-control bg-[#191f28]/85 px-3 py-2 text-xs font-bold text-white shadow-card backdrop-blur-sm sm:left-4 sm:top-4">
        우리 동네 참여율 지도
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-control border border-white/70 bg-white/95 px-3 py-2 shadow-card backdrop-blur-sm sm:bottom-4 sm:left-4">
        <p className="text-[11px] text-muted">
          최근 7일 시민 참여
        </p>

        <p className="mt-0.5 text-sm font-bold text-main">
          총{" "}
          {ranking
            .reduce(
              (total, item) =>
                total + item.reportCount,
              0,
            )
            .toLocaleString()}
          건
        </p>
      </div>

      <Link
        href="/report"
        className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-control bg-brand px-4 text-sm font-bold text-white shadow-floating transition hover:bg-brand-hover sm:bottom-4 sm:right-4"
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-white/20">
          !
        </span>
        정류장 신고
      </Link>
    </div>
  );
}

type MyDistrictCardProps = {
  ranking: ParticipationRanking | null;
  districtName: string;
  allRanking: ParticipationRanking[];
};

function MyDistrictCard({
  ranking,
  districtName,
  allRanking,
}: MyDistrictCardProps) {
  if (!ranking) {
    return (
      <div className="rounded-card border border-brand-line bg-brand-softer p-5 text-center">
        <p className="text-sm font-semibold text-brand-text">
          우리 동네
        </p>

        <strong className="mt-2 block text-xl text-main">
          {districtName}
        </strong>

        <p className="mt-2 text-sm text-muted">
          아직 참여 기록이 없습니다.
        </p>
      </div>
    );
  }

  const previousDistrict =
    allRanking.find(
      (item) =>
        item.rank === ranking.rank - 1,
    ) ?? null;

  const remaining =
    previousDistrict
      ? Math.max(
          1,
          previousDistrict.reportCount -
            ranking.reportCount,
        )
      : 0;

  return (
    <div className="rounded-card border border-brand-line bg-brand-softer p-5">
      <div className="flex items-center gap-5">
        <div className="shrink-0 text-center">
          <strong className="block text-3xl font-extrabold text-brand">
            {ranking.rank}위
          </strong>

          <span className="mt-1 block text-xs font-semibold text-secondary">
            {districtName}
          </span>
        </div>

        <div className="min-w-0 border-l border-brand-line pl-5">
          {previousDistrict ? (
            <>
              <p className="text-sm font-bold text-main">
                {previousDistrict.rank}위{" "}
                {previousDistrict.districtName}
                까지{" "}
                <span className="text-brand">
                  {remaining}건
                </span>
              </p>

              <p className="mt-1 text-xs leading-5 text-muted">
                지금 기록하면 우리 동네 순위가
                올라가요.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-main">
                우리 동네가 현재 1위예요!
              </p>

              <p className="mt-1 text-xs leading-5 text-muted">
                꾸준히 기록해서 순위를
                지켜주세요.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {quickActions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={[
            "flex min-h-[94px] flex-col items-center justify-center rounded-control border px-2 py-3 text-center transition",
            "active:scale-[0.98] md:hover:-translate-y-0.5",
            action.color,
          ].join(" ")}
        >
          {action.icon}

          <strong className="mt-2 block text-sm">
            {action.label}
          </strong>

          <span className="mt-1 hidden text-[11px] opacity-75 xl:block">
            {action.description}
          </span>
        </Link>
      ))}
    </div>
  );
}

type RankingPreviewProps = {
  ranking: ParticipationRanking[];
  homeDistrict: string;
};

function RankingPreview({
  ranking,
  homeDistrict,
}: RankingPreviewProps) {
  return (
    <section className="rounded-card border border-line-light bg-white p-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-main">
          실시간 동네 순위
        </h2>

        <Link
          href="/ranking"
          className="inline-flex min-h-11 items-center text-xs font-semibold text-muted hover:text-brand-text"
        >
          전체 보기 ›
        </Link>
      </header>

      <ol className="mt-2 space-y-3">
        {ranking.map((item) => {
          const isMine =
            item.districtName ===
            homeDistrict;

          return (
            <li
              key={item.districtName}
              className={[
                "grid grid-cols-[20px_58px_minmax(0,1fr)_38px] items-center gap-2 rounded-lg py-1",
                isMine
                  ? "bg-brand-softer px-2"
                  : "",
              ].join(" ")}
            >
              <span
                className={[
                  "text-xs font-bold",
                  isMine
                    ? "text-brand"
                    : "text-muted",
                ].join(" ")}
              >
                {item.rank}
              </span>

              <span
                className={[
                  "truncate text-xs font-semibold",
                  isMine
                    ? "text-brand-text"
                    : "text-main",
                ].join(" ")}
              >
                {item.districtName}
              </span>

              <ProgressBar
                value={item.participation}
              />

              <span
                className={[
                  "text-right text-[11px] font-bold",
                  isMine
                    ? "text-brand"
                    : "text-muted",
                ].join(" ")}
              >
                {item.participation}%
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function OneTouchReportCard() {
  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-danger-soft text-lg font-extrabold text-danger">
          !
        </span>

        <div>
          <p className="text-xs font-semibold text-danger">
            원터치 익명 신고
          </p>

          <h2 className="mt-1 text-lg font-bold text-main">
            정류장에서 불편을 겪으셨나요?
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted">
            정류장을 선택하고 만차 통과, 배차
            지연, 환승 실패를 즉시 신고할 수
            있어요.
          </p>
        </div>
      </div>

      <ButtonLink
        href="/report"
        fullWidth
        className="mt-5"
      >
        정류장 신고하기
      </ButtonLink>
    </Card>
  );
}

function AiInsightCard() {
  return (
    <Card className="border-info/20 bg-info-soft">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-info text-sm font-extrabold text-white">
          AI
        </span>

        <div>
          <p className="text-xs font-semibold text-info">
            AI 교통 인사이트
          </p>

          <h2 className="mt-1 text-lg font-bold text-main">
            시민 기록을 교통 개선 정보로
            분석해요
          </h2>

          <p className="mt-2 text-sm leading-6 text-secondary">
            반복되는 신고와 이동 기록을 분석해
            취약 구간과 배차 개선 필요 지점을
            찾아냅니다.
          </p>
        </div>
      </div>

      <Link
        href="/incidents"
        className="mt-5 inline-flex min-h-11 items-center font-semibold text-info"
      >
        실시간 분석 보기 ›
      </Link>
    </Card>
  );
}

function createMapMarkers(
  ranking: ParticipationRanking[],
): MapMarkerData[] {
  return ranking.flatMap((item) => {
    const coordinates =
      districtCoordinates[item.districtName];

    if (!coordinates) {
      return [];
    }

    return [
      {
        id: item.districtName,
        title: `${item.districtName} 참여율 ${item.participation}%`,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
    ];
  });
}
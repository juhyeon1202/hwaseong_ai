import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  KakaoMap,
  type MapMarkerData,
} from "@/components/kakao-map";
import {
  Badge,
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
import {
  summarizeRegionParticipation,
  type RegionParticipation,
} from "@/lib/regions";

const quickActions = [
  {
    href: "/journal",
    titleKey: "record",
    descriptionKey: "recordDescription",
    icon: "✎",
    color:
      "bg-brand-soft text-brand-text",
  },
  {
    href: "/route",
    titleKey: "directions",
    descriptionKey: "directionsDescription",
    icon: "↗",
    color: "bg-info-soft text-info",
  },
  {
    href: "/rewards",
    titleKey: "roulette",
    descriptionKey: "rouletteDescription",
    icon: "◎",
    color:
      "bg-warning-soft text-warning",
  },
] as const;

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

export default async function HomePage() {
  const user = await getCurrentUser();

  const [ranking, homeDistrict] =
    await Promise.all([
      getParticipationRanking(),
      getHomeDistrict(
        user?.id ?? null,
      ),
    ]);

  const myRanking =
    ranking.find(
      (item) =>
        item.districtName ===
        homeDistrict,
    ) ?? null;

  const mapMarkers =
    createMapMarkers(ranking);

  const regionParticipation =
    summarizeRegionParticipation(
      ranking,
    );

  return (
      <div className="space-y-6">
        <HeroSection />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.72fr)]">
          <div className="space-y-6">
            <ParticipationMap
              markers={mapMarkers}
              ranking={ranking}
              regionParticipation={
                regionParticipation
              }
            />

            <NeighborhoodCard
              homeDistrict={homeDistrict}
              ranking={myRanking}
            />

            <QuickActions />
          </div>

          <aside className="space-y-6">
            <RankingCard
              ranking={ranking.slice(
                0,
                3,
              )}
              homeDistrict={
                homeDistrict
              }
            />

            <ReportCard />

            <AiInsightCard />
          </aside>
        </div>
      </div>
  );
}

function HeroSection() {
  const t = useTranslations("Home");
  return (
    <section className="flex flex-col gap-4 border-b border-line-light pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Badge>
          {t("badge")}
        </Badge>

        <h1 className="mt-3 text-2xl font-bold leading-tight text-main sm:text-3xl">
          {t("title")}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">
          {t("description")}
        </p>
      </div>

      <Link
        href="/incidents"
        className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-control bg-info-soft px-4 text-sm font-semibold text-info sm:self-auto"
      >
        <span className="size-2 rounded-pill bg-info" />
        {t("trafficAlerts")}
      </Link>
    </section>
  );
}

type ParticipationMapProps = {
  markers: MapMarkerData[];
  ranking: ParticipationRanking[];
  regionParticipation: RegionParticipation[];
};

function ParticipationMap({
  markers,
  ranking,
  regionParticipation,
}: ParticipationMapProps) {
  const t = useTranslations("Home");
  const totalReports =
    ranking.reduce(
      (sum, item) =>
        sum + item.reportCount,
      0,
    );

  return (
    <Card
      padded={false}
      className="overflow-hidden"
    >
      <div className="relative">
        <KakaoMap
          center={{
            latitude: 37.1995,
            longitude: 127.0645,
          }}
          markers={markers}
          regionOverlays={
            regionParticipation
          }
          level={9}
          height={420}
        />

        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-control bg-[#191f28]/85 px-4 py-3 text-white shadow-card backdrop-blur sm:left-4 sm:top-4">
          <p className="text-xs text-white/70">
            {t("recentParticipation")}
          </p>

          <p className="mt-1 text-lg font-bold">
            {t("totalCount", { count: totalReports.toLocaleString() })}
          </p>
        </div>

        <div className="absolute inset-x-3 bottom-3 z-10 rounded-card border border-white/50 bg-surface/95 p-4 shadow-floating backdrop-blur sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[360px]">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-danger-soft text-lg font-bold text-danger">
              !
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted">
                {t("stopProblem")}
              </p>

              <p className="mt-1 font-bold text-main">
                {t("oneTouchAnonymous")}
              </p>
            </div>

            <ButtonLink
              href="/report"
              className="shrink-0"
            >
              {t("reportNow")}
            </ButtonLink>
          </div>
        </div>
      </div>
    </Card>
  );
}

type NeighborhoodCardProps = {
  homeDistrict: string | null;
  ranking:
    | ParticipationRanking
    | null;
};

function NeighborhoodCard({
  homeDistrict,
  ranking,
}: NeighborhoodCardProps) {
  if (!homeDistrict) {
    return (
      <Card className="border-brand-line bg-brand-softer">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-text">
              우리 동네 순위
            </p>

            <h2 className="mt-2 text-lg font-bold text-main">
              거주지역을 설정해 주세요
            </h2>

            <p className="mt-2 text-sm text-muted">
              마이페이지에서 거주지역을
              설정하면 우리 동네 순위를
              확인할 수 있어요.
            </p>
          </div>

          <ButtonLink
            href="/mypage"
            variant="secondary"
          >
            지역 설정
          </ButtonLink>
        </div>
      </Card>
    );
  }

  if (!ranking) {
    return (
      <Card className="border-brand-line bg-brand-softer">
        <p className="text-sm font-semibold text-brand-text">
          우리 동네
        </p>

        <h2 className="mt-2 text-xl font-bold text-main">
          {homeDistrict}
        </h2>

        <p className="mt-2 text-sm text-muted">
          아직 최근 참여 기록이 없습니다.
          첫 교통일지를 남겨 주세요.
        </p>

        <ButtonLink
          href="/journal"
          className="mt-5"
        >
          우리 동네 기록 참여
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card className="border-brand-line bg-brand-softer">
      <div className="flex items-center gap-5">
        <div>
          <p className="text-sm font-semibold text-brand-text">
            우리 동네
          </p>

          <p className="mt-1 text-sm text-secondary">
            {homeDistrict}
          </p>
        </div>

        <strong className="ml-auto text-3xl font-bold text-brand">
          {ranking.rank}위
        </strong>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted">
            상대 참여도
          </span>

          <span className="font-bold text-brand-text">
            {ranking.participation}%
          </span>
        </div>

        <ProgressBar
          value={
            ranking.participation
          }
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-secondary">
        최근 7일 동안{" "}
        <strong className="text-main">
          {ranking.reportCount}건
        </strong>
        의 교통 참여 기록이 모였어요.
      </p>
    </Card>
  );
}

function QuickActions() {
  const t = useTranslations("Home");
  return (
    <section>
      <h2 className="text-lg font-bold text-main">
        {t("quickActions")}
      </h2>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {quickActions.map(
          (action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-card border border-line bg-surface p-4 shadow-card transition-transform active:scale-[0.98] sm:p-5 md:hover:-translate-y-0.5"
            >
              <span
                className={[
                  "flex size-10 items-center justify-center rounded-control text-lg font-bold",
                  action.color,
                ].join(" ")}
              >
                {action.icon}
              </span>

              <strong className="mt-4 block text-sm text-main">
                {t(action.titleKey)}
              </strong>

              <span className="mt-1 hidden text-xs leading-5 text-muted sm:block">
                {t(action.descriptionKey)}
              </span>
            </Link>
          ),
        )}
      </div>
    </section>
  );
}

type RankingCardProps = {
  ranking: ParticipationRanking[];
  homeDistrict: string | null;
};

function RankingCard({
  ranking,
  homeDistrict,
}: RankingCardProps) {
  const t = useTranslations("Home");
  return (
    <Card>
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-main">
            {t("ranking")}
          </h2>

          <p className="mt-1 text-xs text-muted">
            {t("rankingPeriod")}
          </p>
        </div>

        <Link
          href="/ranking"
          className="text-xs font-semibold text-brand-text"
        >
          {t("viewAll")}
        </Link>
      </header>

      <ol className="mt-5 space-y-4">
        {ranking.map((item) => {
          const isMyDistrict =
            item.districtName ===
            homeDistrict;

          return (
            <li
              key={item.districtName}
              className={[
                "grid grid-cols-[32px_1fr_48px] items-center gap-3 rounded-control",
                isMyDistrict
                  ? "bg-brand-softer p-2"
                  : "",
              ].join(" ")}
            >
              <span
                className={[
                  "flex size-8 items-center justify-center rounded-pill text-xs font-bold",
                  item.rank === 1
                    ? "bg-brand text-on-brand"
                    : item.rank === 2
                      ? "bg-info text-white"
                      : "bg-surface-muted text-secondary",
                ].join(" ")}
              >
                {item.rank}
              </span>

              <div className="min-w-0">
                <p className="mb-2 truncate text-sm font-semibold text-main">
                  {item.districtName}
                  {isMyDistrict
                    ? ` · ${t("myNeighborhood")}`
                    : ""}
                </p>

                <ProgressBar
                  value={
                    item.participation
                  }
                />
              </div>

              <strong className="text-right text-sm text-brand-text">
                {item.participation}%
              </strong>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function ReportCard() {
  const t = useTranslations("Home");
  return (
    <Card>
      <Badge variant="danger">
        {t("oneTouchReport")}
      </Badge>

      <h2 className="mt-4 font-bold text-main">
        {t("busPassed")}
      </h2>

      <p className="mt-2 text-sm leading-6 text-muted">
        {t("reportDescription")}
      </p>

      <ButtonLink
        href="/report"
        fullWidth
        className="mt-5"
      >
        {t("reportStop")}
      </ButtonLink>
    </Card>
  );
}

function AiInsightCard() {
  const t = useTranslations("Home");
  return (
    <Card className="border-info/20 bg-info-soft">
      <Badge variant="info">
        {t("aiInsight")}
      </Badge>

      <h2 className="mt-4 font-bold text-main">
        {t("aiTitle")}
      </h2>

      <p className="mt-2 text-sm leading-6 text-secondary">
        {t("aiDescription")}
      </p>

      <Link
        href="/incidents"
        className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-info"
      >
        {t("viewAnalysis")}
      </Link>
    </Card>
  );
}

function createMapMarkers(
  ranking: ParticipationRanking[],
): MapMarkerData[] {
  return ranking.flatMap((item) => {
    const coordinates =
      districtCoordinates[
        item.districtName
      ];

    if (!coordinates) {
      return [];
    }

    return [
      {
        id: item.districtName,
        title: `${item.districtName} 참여도 ${item.participation}%`,
        latitude:
          coordinates.latitude,
        longitude:
          coordinates.longitude,
      },
    ];
  });
}

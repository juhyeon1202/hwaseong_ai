import type { Metadata } from "next";
import Link from "next/link";

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

export const metadata: Metadata = {
  title: "전체 동네 순위",
};

export default async function RankingPage() {
  const user = await getCurrentUser();

  const [ranking, homeDistrict] =
    await Promise.all([
      getParticipationRanking(),
      getHomeDistrict(
        user?.id ?? null,
      ),
    ]);

  const podium = ranking.slice(0, 3);
  const remaining = ranking.slice(3);

  const myRanking =
    ranking.find(
      (item) =>
        item.districtName ===
        homeDistrict,
    ) ?? null;

  return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header>
          <p className="text-sm font-semibold text-brand-text">
            시민 참여 랭킹
          </p>

          <h1 className="mt-2 text-2xl font-bold text-main sm:text-3xl">
            전체 동네 순위
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted">
            최근 7일 동안 모인 정류장 신고와
            시민 참여 기록을 기준으로 계산한
            순위입니다.
          </p>
        </header>

        <Podium ranking={podium} />

        {myRanking ? (
          <MyDistrictCard
            ranking={myRanking}
          />
        ) : (
          <Card className="border-brand-line bg-brand-softer">
            <h2 className="font-bold text-main">
              우리 동네 기록에 참여해
              주세요
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted">
              거주지역을 설정하고 교통일지를
              기록하면 우리 동네 순위에
              반영됩니다.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonLink href="/journal">
                기록하기
              </ButtonLink>

              <ButtonLink
                href="/mypage"
                variant="secondary"
              >
                거주지역 설정
              </ButtonLink>
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-main">
                전체 순위
              </h2>

              <p className="mt-1 text-sm text-muted">
                참여 기록이 있는 지역
              </p>
            </div>

            <span className="text-xs text-muted">
              총 {ranking.length}개 지역
            </span>
          </div>

          <ol className="mt-6 divide-y divide-line-light">
            {remaining.length > 0 ? (
              remaining.map((item) => (
                <RankingRow
                  key={
                    item.districtName
                  }
                  item={item}
                  isMyDistrict={
                    item.districtName ===
                    homeDistrict
                  }
                />
              ))
            ) : (
              <li className="py-8 text-center text-sm text-muted">
                추가 순위 데이터가 없습니다.
              </li>
            )}
          </ol>
        </Card>

        <section className="rounded-card bg-[#191f28] p-6 text-white sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">
              우리 동네 순위를
              올려볼까요?
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/70">
              오늘의 이동 경험을 기록하면
              교통 개선을 위한 시민 데이터로
              활용됩니다.
            </p>
          </div>

          <Link
            href="/journal"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white sm:mt-0"
          >
            우리 동네 기록 참여
          </Link>
        </section>
      </div>
  );
}

function Podium({
  ranking,
}: {
  ranking: ParticipationRanking[];
}) {
  const ordered = [
    ranking[1],
    ranking[0],
    ranking[2],
  ].filter(
    (
      item,
    ): item is ParticipationRanking =>
      Boolean(item),
  );

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-3 items-end gap-2 pt-5 sm:gap-4">
        {ordered.map((item) => {
          const isFirst =
            item.rank === 1;

          return (
            <div
              key={item.districtName}
              className="text-center"
            >
              <span
                className={[
                  "mx-auto flex items-center justify-center rounded-pill font-bold",
                  isFirst
                    ? "size-16 bg-brand text-xl text-white"
                    : "size-12 bg-surface-muted text-secondary",
                ].join(" ")}
              >
                {item.rank}위
              </span>

              <p className="mt-3 truncate text-sm font-bold text-main">
                {item.districtName}
              </p>

              <p
                className={[
                  "mt-1 font-bold",
                  isFirst
                    ? "text-lg text-brand"
                    : "text-sm text-info",
                ].join(" ")}
              >
                {item.participation}%
              </p>

              <div
                className={[
                  "mt-4 rounded-t-control",
                  isFirst
                    ? "h-24 bg-brand-soft"
                    : item.rank === 2
                      ? "h-16 bg-info-soft"
                      : "h-12 bg-surface-muted",
                ].join(" ")}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MyDistrictCard({
  ranking,
}: {
  ranking: ParticipationRanking;
}) {
  return (
    <Card className="border-brand-line bg-brand-softer">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs font-semibold text-brand-text">
            우리 동네
          </p>

          <h2 className="mt-1 text-lg font-bold text-main">
            {ranking.districtName}
          </h2>
        </div>

        <strong className="ml-auto text-3xl font-bold text-brand">
          {ranking.rank}위
        </strong>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs">
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
    </Card>
  );
}

type RankingRowProps = {
  item: ParticipationRanking;
  isMyDistrict: boolean;
};

function RankingRow({
  item,
  isMyDistrict,
}: RankingRowProps) {
  return (
    <li
      className={[
        "grid grid-cols-[40px_1fr_56px] items-center gap-3 py-4",
        isMyDistrict
          ? "rounded-control bg-brand-softer px-3"
          : "",
      ].join(" ")}
    >
      <span className="text-center text-sm font-bold text-muted">
        {item.rank}
      </span>

      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-main">
            {item.districtName}
          </p>

          {isMyDistrict && (
            <span className="shrink-0 rounded-pill bg-brand px-2 py-1 text-[10px] font-bold text-white">
              우리 동네
            </span>
          )}
        </div>

        <ProgressBar
          value={
            item.participation
          }
        />

        <p className="mt-2 text-xs text-muted">
          참여 기록{" "}
          {item.reportCount}건 · 활성
          정류장{" "}
          {item.activeStopCount}곳
        </p>
      </div>

      <strong className="text-right text-sm text-brand-text">
        {item.participation}%
      </strong>
    </li>
  );
}
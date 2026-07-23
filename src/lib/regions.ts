import type { ParticipationRanking } from "@/lib/participation";

export type RegionKey =
  | "dongtan"
  | "byeongjeom"
  | "bongdam"
  | "hyangnam"
  | "namyang";

export type RegionDefinition = {
  key: RegionKey;
  name: string;
  latitude: number;
  longitude: number;
};

export type RegionDistrictParticipation = {
  districtName: string;
  participation: number;
  temperature: number;
  reportCount: number;
};

export type RegionParticipation = {
  key: RegionKey;
  name: string;
  latitude: number;
  longitude: number;
  reportCount: number;
  participation: number;
  temperature: number;
  hasData: boolean;
  districts: RegionDistrictParticipation[];
};

/*
 * 참여율(%)을 사람 체온과 같은 형식(36.5도 기준)으로 변환합니다.
 * 절대적인 %를 그대로 온도로 치환하지 않고, 비교 대상 그룹(5개 생활권 /
 * 전체 행정동) 안에서의 상대적 위치(min-max 정규화)를 기준으로
 * BASELINE_TEMPERATURE를 중심으로 분산시킵니다.
 * - 그룹 내 최댓값 → 항상 BASELINE + TEMPERATURE_AMPLITUDE
 * - 그룹 내 최솟값 → 항상 BASELINE - TEMPERATURE_AMPLITUDE
 * - 그룹 내 값이 전부 같으면(분산 없음) 전부 BASELINE
 */
export const BASELINE_TEMPERATURE = 36.5;
export const TEMPERATURE_AMPLITUDE = 1.5;

function computeTemperature(
  value: number,
  min: number,
  max: number,
): number {
  const mid = (max + min) / 2;
  const halfRange = (max - min) / 2;

  if (halfRange === 0) {
    return BASELINE_TEMPERATURE;
  }

  const normalized =
    (value - mid) / halfRange;

  return (
    BASELINE_TEMPERATURE +
    normalized * TEMPERATURE_AMPLITUDE
  );
}

/*
 * "온도 → 시각적 표현(채움 %, 색상)" 변환에만 쓰는 예상 온도 범위입니다.
 * 온도 산출 로직(BASELINE_TEMPERATURE ± TEMPERATURE_AMPLITUDE)과는 별개의
 * 값으로, 온도 편차가 작을 때 채움 %가 0%/100% 극단으로 몰리지 않고
 * 적당히 구분되는 중간 대역(약 35.3~37.8도 → 채움 38%~63% 감각)에
 * 오도록 넓게 잡은 임시 기준입니다. 실데이터가 쌓여서 권역 간 온도 편차가
 * 지금보다 커지면 이 값을 재조정해야 합니다(그 전까지는 31.5~41.5로 고정).
 */
export const EXPECTED_TEMP_MIN = 31.5;
export const EXPECTED_TEMP_MAX = 41.5;

function temperatureToUnitRange(
  temperature: number,
): number {
  const ratio =
    (temperature -
      EXPECTED_TEMP_MIN) /
    (EXPECTED_TEMP_MAX -
      EXPECTED_TEMP_MIN);

  return Math.min(
    1,
    Math.max(0, ratio),
  );
}

export function temperatureToFillPercent(
  temperature: number,
): number {
  return (
    temperatureToUnitRange(
      temperature,
    ) * 100
  );
}

export function temperatureToColorRatio(
  temperature: number,
): number {
  return temperatureToUnitRange(
    temperature,
  );
}

/*
 * 생활권 중심 좌표는 행정동 경계가 아니라 각 권역의 대표 지점(중심가/거점)
 * 근사치입니다. 행정동 단위 세분화는 이번 작업 범위가 아닙니다.
 */
export const regionDefinitions: RegionDefinition[] = [
  {
    key: "dongtan",
    name: "동탄권",
    latitude: 37.201,
    longitude: 127.075,
  },
  {
    key: "byeongjeom",
    name: "병점권",
    latitude: 37.209,
    longitude: 127.038,
  },
  {
    key: "bongdam",
    name: "봉담권",
    latitude: 37.22,
    longitude: 126.95,
  },
  {
    key: "hyangnam",
    name: "향남권",
    latitude: 37.148,
    longitude: 126.911,
  },
  {
    key: "namyang",
    name: "남양권",
    latitude: 37.2,
    longitude: 126.832,
  },
];

const districtToRegion: Record<
  string,
  RegionKey
> = {
  // 동탄권 — 동탄신도시 일대
  동탄1동: "dongtan",
  동탄2동: "dongtan",
  동탄3동: "dongtan",
  동탄4동: "dongtan",
  동탄5동: "dongtan",
  동탄6동: "dongtan",
  동탄7동: "dongtan",
  동탄8동: "dongtan",
  동탄9동: "dongtan",
  산척동: "dongtan",
  석우동: "dongtan",
  청계동: "dongtan",

  // 병점권 — 병점·진안 생활권
  병점1동: "byeongjeom",
  병점2동: "byeongjeom",
  진안동: "byeongjeom",
  반월동: "byeongjeom",
  기배동: "byeongjeom",
  능동: "byeongjeom",

  // 봉담권 — 서북부
  봉담읍: "bongdam",
  매송면: "bongdam",
  비봉면: "bongdam",

  // 향남권 — 남부
  향남읍: "hyangnam",
  팔탄면: "hyangnam",
  정남면: "hyangnam",
  양감면: "hyangnam",

  // 남양권 — 시청 소재지 및 서해안 일대
  남양읍: "namyang",
  우정읍: "namyang",
  서신면: "namyang",
  송산면: "namyang",
  마도면: "namyang",
  장안면: "namyang",
  새솔동: "namyang",
};

export function getRegionForDistrict(
  districtName: string,
): RegionKey | null {
  return (
    districtToRegion[districtName] ??
    null
  );
}

export function summarizeRegionParticipation(
  ranking: ParticipationRanking[],
): RegionParticipation[] {
  const districtsByRegion = new Map<
    RegionKey,
    ParticipationRanking[]
  >();

  for (const item of ranking) {
    const region = getRegionForDistrict(
      item.districtName,
    );

    if (!region) {
      continue;
    }

    const list =
      districtsByRegion.get(region) ??
      [];

    list.push(item);
    districtsByRegion.set(
      region,
      list,
    );
  }

  const reportCountByRegion = new Map(
    Array.from(
      districtsByRegion.entries(),
    ).map(([region, items]) => [
      region,
      items.reduce(
        (sum, item) =>
          sum + item.reportCount,
        0,
      ),
    ]),
  );

  const maxReportCount = Math.max(
    ...Array.from(
      reportCountByRegion.values(),
    ),
    1,
  );

  const regionParticipationByKey =
    new Map(
      regionDefinitions.map(
        (region) => {
          const totalReportCount =
            reportCountByRegion.get(
              region.key,
            ) ?? 0;

          const participation =
            totalReportCount > 0
              ? Math.max(
                  1,
                  Math.round(
                    (totalReportCount /
                      maxReportCount) *
                      100,
                  ),
                )
              : 0;

          return [
            region.key,
            participation,
          ] as const;
        },
      ),
    );

  /*
   * 참여 건수가 0건인 권역은 실제 신호가 없으므로 상대 비교 대상에서
   * 제외합니다(끼워 넣으면 다른 권역의 온도가 "0건과 비교한 상대값"으로
   * 왜곡됩니다). 0건 권역은 아래에서 BASELINE_TEMPERATURE로 고정됩니다.
   */
  const activeRegionParticipationValues =
    regionDefinitions
      .filter(
        (region) =>
          (reportCountByRegion.get(
            region.key,
          ) ?? 0) > 0,
      )
      .map(
        (region) =>
          regionParticipationByKey.get(
            region.key,
          ) ?? 0,
      );

  const regionTemperatureRange =
    activeRegionParticipationValues.length >
    0
      ? {
          min: Math.min(
            ...activeRegionParticipationValues,
          ),
          max: Math.max(
            ...activeRegionParticipationValues,
          ),
        }
      : // 데이터 있는 권역이 하나도 없으면 아래에서 모든 권역이
        // hasData=false로 BASELINE_TEMPERATURE를 바로 대입받으므로
        // 이 범위는 실제로 쓰이지 않습니다.
        { min: 0, max: 0 };

  const allDistrictParticipation =
    Array.from(
      districtsByRegion.values(),
    )
      .flat()
      .map(
        (item) => item.participation,
      );

  const districtTemperatureRange = {
    min: Math.min(
      ...allDistrictParticipation,
      0,
    ),
    max: Math.max(
      ...allDistrictParticipation,
      0,
    ),
  };

  return regionDefinitions.map(
    (region) => {
      const totalReportCount =
        reportCountByRegion.get(
          region.key,
        ) ?? 0;

      const hasData =
        totalReportCount > 0;

      const participation =
        regionParticipationByKey.get(
          region.key,
        ) ?? 0;

      const districts = (
        districtsByRegion.get(
          region.key,
        ) ?? []
      )
        .slice()
        .sort(
          (a, b) =>
            b.reportCount -
            a.reportCount,
        )
        .map((item) => ({
          districtName:
            item.districtName,
          participation:
            item.participation,
          temperature:
            computeTemperature(
              item.participation,
              districtTemperatureRange.min,
              districtTemperatureRange.max,
            ),
          reportCount:
            item.reportCount,
        }));

      return {
        key: region.key,
        name: region.name,
        latitude: region.latitude,
        longitude: region.longitude,
        reportCount: totalReportCount,
        participation,
        // 참여 건수 0건인 권역은 상대 비교 없이 기준 온도로 고정합니다.
        temperature: hasData
          ? computeTemperature(
              participation,
              regionTemperatureRange.min,
              regionTemperatureRange.max,
            )
          : BASELINE_TEMPERATURE,
        hasData,
        districts,
      };
    },
  );
}

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

const NATIONAL_STOP_API =
  "https://api.odcloud.kr/api/15067528/v1/uddi:f74b9799-9db1-4754-a5d0-b66e2ae705f3";

const RESULT_LIMIT = 20;

type PublicStopRow = {
  정류장번호?: string;
  정류장명?: string;
  위도?: number | string;
  경도?: number | string;
  모바일단축번호?: string;
  도시코드?: string;
  도시명?: string;
  관리도시명?: string;
};

type PublicStopResponse = {
  currentCount?: number;
  data?: PublicStopRow[];
  matchCount?: number;
  page?: number;
  perPage?: number;
  totalCount?: number;
};

type SavedStop = {
  id: number;
  name: string;
  stopNumber: string | null;
  districtName: string | null;
};

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  const serviceKey =
    process.env.DATA_GO_KR_SERVICE_KEY?.trim();

  if (!serviceKey) {
    return NextResponse.json(
      {
        message:
          "DATA_GO_KR_SERVICE_KEY 환경변수가 설정되지 않았습니다.",
      },
      {
        status: 500,
      },
    );
  }

  const query =
    request.nextUrl.searchParams
      .get("query")
      ?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json(
      {
        message:
          "정류장명 또는 정류장 번호를 2자 이상 입력해 주세요.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    /*
     * 정류장명, 정류장 고유번호, 모바일 단축번호를
     * 각각 조회한 후 하나의 검색 결과로 합칩니다.
     */
    const responses = await Promise.all([
      requestPublicStops(
        serviceKey,
        "정류장명",
        query,
      ),
      requestPublicStops(
        serviceKey,
        "정류장번호",
        query,
      ),
      requestPublicStops(
        serviceKey,
        "모바일단축번호",
        query,
      ),
    ]);

    const uniqueRows = new Map<
      string,
      PublicStopRow
    >();

    for (const response of responses) {
      for (const row of response.data ?? []) {
        const externalId = String(
          row.정류장번호 ?? "",
        ).trim();

        if (!externalId) {
          continue;
        }

        uniqueRows.set(
          externalId,
          row,
        );
      }
    }

    const normalizedStops = Array.from(
      uniqueRows.values(),
    )
      .map(normalizeStop)
      .filter(
        (
          stop,
        ): stop is NonNullable<
          ReturnType<typeof normalizeStop>
        > => stop !== null,
      )
      .slice(0, RESULT_LIMIT);

    /*
     * 선택한 정류장을 route_requests에 저장할 때
     * transit_stops의 실제 ID가 필요하므로 검색 결과를
     * Supabase에 upsert하고 DB ID를 반환합니다.
     */
    const savedResults = await Promise.all(
      normalizedStops.map(
        async (stop) => {
          const {
            data,
            error,
          } = await supabaseAdmin
            .from("transit_stops")
            .upsert(
              {
                external_id:
                  stop.externalId,
                city_code:
                  stop.cityCode,
                name: stop.name,
                stop_number:
                  stop.stopNumber,
                district_name:
                  stop.districtName,
                location:
                  `POINT(${stop.longitude} ${stop.latitude})`,
                source:
                  "DATA_GO_KR_NATIONAL",
              },
              {
                onConflict:
                  "external_id",
              },
            )
            .select(
              `
                id,
                name,
                stop_number,
                district_name
              `,
            )
            .single();

          if (error || !data) {
            console.error(
              "[Route stop upsert error]",
              error,
            );

            return null;
          }

          return {
            id: Number(data.id),
            name: String(data.name),
            stopNumber:
              data.stop_number
                ? String(
                    data.stop_number,
                  )
                : null,
            districtName:
              data.district_name
                ? String(
                    data.district_name,
                  )
                : null,
          } satisfies SavedStop;
        },
      ),
    );

    const stops = savedResults.filter(
      (
        stop,
      ): stop is SavedStop =>
        stop !== null,
    );

    return NextResponse.json({
      query,
      count: stops.length,
      stops,
    });
  } catch (error) {
    console.error(
      "[National route stop search error]",
      error,
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "정류장을 검색하지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}

async function requestPublicStops(
  serviceKey: string,
  column:
    | "정류장명"
    | "정류장번호"
    | "모바일단축번호",
  query: string,
) {
  const params =
    new URLSearchParams({
      page: "1",
      perPage: String(
        RESULT_LIMIT,
      ),
      returnType: "JSON",
      serviceKey,
    });

  params.set(
    `cond[${column}::LIKE]`,
    query,
  );

  const response = await fetch(
    `${NATIONAL_STOP_API}?${params.toString()}`,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  const responseText =
    await response.text();

  if (!response.ok) {
    console.error(
      "[National stop API error]",
      response.status,
      responseText.slice(0, 500),
    );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      throw new Error(
        "전국 버스정류장 API 요청이 거부되었습니다. 공공데이터포털에서 해당 API의 활용신청 상태와 인증키를 확인해 주세요.",
      );
    }

    throw new Error(
      `전국 버스정류장 API 조회에 실패했습니다. (${response.status})`,
    );
  }

  try {
    return JSON.parse(
      responseText,
    ) as PublicStopResponse;
  } catch {
    console.error(
      "[National stop non-JSON response]",
      responseText.slice(0, 500),
    );

    throw new Error(
      "전국 버스정류장 API가 올바른 JSON을 반환하지 않았습니다.",
    );
  }
}

function normalizeStop(
  row: PublicStopRow,
) {
  const externalId = String(
    row.정류장번호 ?? "",
  ).trim();

  const name = String(
    row.정류장명 ?? "",
  ).trim();

  const mobileNumber = String(
    row.모바일단축번호 ?? "",
  ).trim();

  const cityCode = String(
    row.도시코드 ?? "",
  ).trim();

  const districtName = String(
    row.도시명 ??
      row.관리도시명 ??
      "",
  ).trim();

  const latitude = Number(
    row.위도,
  );

  const longitude = Number(
    row.경도,
  );

  if (
    !externalId ||
    !name ||
    !isValidLatitude(latitude) ||
    !isValidLongitude(longitude)
  ) {
    return null;
  }

  return {
    externalId:
      `national:${externalId}`,
    name,

    // 화면에는 사용자가 알아보기 쉬운 ARS 번호를 우선 표시
    stopNumber:
      mobileNumber ||
      externalId,

    districtName:
      districtName || null,

    cityCode:
      cityCode || null,

    latitude,
    longitude,
  };
}

function isValidLatitude(
  value: number,
) {
  return (
    Number.isFinite(value) &&
    value >= -90 &&
    value <= 90
  );
}

function isValidLongitude(
  value: number,
) {
  return (
    Number.isFinite(value) &&
    value >= -180 &&
    value <= 180
  );
}
import {
  NextRequest,
  NextResponse,
} from "next/server";

const KAKAO_PLACE_API =
  "https://dapi.kakao.com/v2/local/search/keyword.json";

const KAKAO_TRANSIT_API =
  "https://dapi.kakao.com/v2/routing/publictraffic";

export const dynamic = "force-dynamic";

type KakaoPlace = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
};

type KakaoTransitStep = {
  properties?: {
    type?: "BUS" | "SUBWAY" | "WALKING";
    guidance?: string;
    distance?: number;
    time?: number;
    vehicles?: {
      name?: string;
    }[];
  };
};

type KakaoTransitRoute = {
  properties?: {
    type?: "BUS" | "SUBWAY" | "BUS_AND_SUBWAY";
    totalDistance?: number;
    totalTime?: number;
    transfers?: number;
    fare?: {
      value?: number;
    };
  };
  steps?: KakaoTransitStep[];
};

class KakaoApiError extends Error {
  status: number;

  constructor(
    status: number,
    message: string,
  ) {
    super(message);
    this.status = status;
  }
}

export async function GET(
  request: NextRequest,
) {
  const apiKey =
    process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        message:
          "KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.",
      },
      {
        status: 500,
      },
    );
  }

  try {
    const { searchParams } =
      request.nextUrl;

    const mode =
      searchParams.get("mode");

    if (mode === "places") {
      return await searchPlaces(
        searchParams,
        apiKey,
      );
    }

    if (mode === "routes") {
      return await searchTransitRoutes(
        searchParams,
        apiKey,
      );
    }

    return NextResponse.json(
      {
        message:
          "지원하지 않는 API 요청입니다.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    const status =
      error instanceof KakaoApiError
        ? error.status
        : 500;

    const message =
      error instanceof Error
        ? error.message
        : "카카오 API 요청 중 오류가 발생했습니다.";

    console.error(
      "[Kakao API error]",
      error,
    );

    return NextResponse.json(
      { message },
      { status },
    );
  }
}

async function searchPlaces(
  searchParams: URLSearchParams,
  apiKey: string,
) {
  const query =
    searchParams.get("query")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json(
      {
        message:
          "검색어를 2자 이상 입력해 주세요.",
      },
      {
        status: 400,
      },
    );
  }

  const params =
    new URLSearchParams({
      query,
      size: "8",
      sort: "accuracy",
    });

  const result =
    await requestKakao<{
      documents?: KakaoPlace[];
    }>(
      `${KAKAO_PLACE_API}?${params.toString()}`,
      apiKey,
    );

  const documents =
    Array.isArray(result.documents)
      ? result.documents
      : [];

  return NextResponse.json({
    places: documents.map(
      (place) => ({
        id: place.id,
        name: place.place_name,
        address:
          place.road_address_name ||
          place.address_name ||
          "주소 정보 없음",
        longitude: Number(place.x),
        latitude: Number(place.y),
      }),
    ),
  });
}

async function searchTransitRoutes(
  searchParams: URLSearchParams,
  apiKey: string,
) {
  const startX =
    searchParams.get("startX");

  const startY =
    searchParams.get("startY");

  const endX =
    searchParams.get("endX");

  const endY =
    searchParams.get("endY");

  const coordinates = [
    startX,
    startY,
    endX,
    endY,
  ];

  const hasInvalidCoordinate =
    coordinates.some(
      (value) =>
        value === null ||
        value.trim() === "" ||
        !Number.isFinite(Number(value)),
    );

  if (hasInvalidCoordinate) {
    return NextResponse.json(
      {
        message:
          "출발지와 도착지 좌표가 올바르지 않습니다.",
      },
      {
        status: 400,
      },
    );
  }

  const params =
    new URLSearchParams({
      start_x: startX!,
      start_y: startY!,
      end_x: endX!,
      end_y: endY!,
      s_name:
        searchParams.get("startName") ||
        "출발지",
      e_name:
        searchParams.get("endName") ||
        "도착지",
      input_coord: "WGS84",
      output_coord: "WGS84",
    });

  const result =
    await requestKakao<{
      status?: string;
      properties?: {
        landingURL?: string;
      };
      routes?: KakaoTransitRoute[];
    }>(
      `${KAKAO_TRANSIT_API}?${params.toString()}`,
      apiKey,
    );

  const status =
    result.status ?? "UNKNOWN";

  const routes =
    Array.isArray(result.routes)
      ? result.routes
      : [];

  if (status !== "OK") {
    return NextResponse.json({
      status,
      landingUrl:
        result.properties?.landingURL ??
        null,
      routes: [],
    });
  }

  return NextResponse.json({
    status,
    landingUrl:
      result.properties?.landingURL ??
      null,
    routes: routes
      .slice(0, 5)
      .map((route, index) => {
        const properties =
          route.properties ?? {};

        const steps =
          Array.isArray(route.steps)
            ? route.steps
            : [];

        return {
          id: index,
          type:
            properties.type ??
            "BUS_AND_SUBWAY",
          totalDistance:
            properties.totalDistance ??
            0,
          totalTime:
            properties.totalTime ?? 0,
          transfers:
            properties.transfers ?? 0,
          fare:
            properties.fare?.value ??
            null,
          steps: steps.map((step) => {
            const stepProperties =
              step.properties ?? {};

            const vehicles =
              Array.isArray(
                stepProperties.vehicles,
              )
                ? stepProperties.vehicles
                : [];

            return {
              type:
                stepProperties.type ??
                "WALKING",
              guidance:
                stepProperties.guidance ??
                "이동",
              distance:
                stepProperties.distance ??
                0,
              time:
                stepProperties.time ?? 0,
              vehicles: vehicles
                .map(
                  (vehicle) =>
                    vehicle.name,
                )
                .filter(
                  (
                    name,
                  ): name is string =>
                    Boolean(name),
                ),
            };
          }),
        };
      }),
  });
}

async function requestKakao<T>(
  url: string,
  apiKey: string,
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization:
        `KakaoAK ${apiKey}`,
    },
    cache: "no-store",
  });

  const responseText =
    await response.text();

  let result: unknown;

  try {
    result = responseText
      ? JSON.parse(responseText)
      : {};
  } catch {
    throw new KakaoApiError(
      502,
      "카카오 API가 올바른 JSON 응답을 반환하지 않았습니다.",
    );
  }

  if (!response.ok) {
    throw new KakaoApiError(
      response.status,
      getKakaoErrorMessage(result),
    );
  }

  return result as T;
}

function getKakaoErrorMessage(
  result: unknown,
) {
  if (
    typeof result === "object" &&
    result !== null
  ) {
    if (
      "message" in result &&
      typeof result.message ===
        "string"
    ) {
      return result.message;
    }

    if (
      "msg" in result &&
      typeof result.msg === "string"
    ) {
      return result.msg;
    }
  }

  return "카카오 API 요청에 실패했습니다.";
}
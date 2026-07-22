import { NextRequest, NextResponse } from "next/server";

const KAKAO_PLACE_API =
  "https://dapi.kakao.com/v2/local/search/keyword.json";

const KAKAO_TRANSIT_API =
  "https://dapi.kakao.com/v2/routing/publictraffic";

export async function GET(
  request: NextRequest,
) {
  const apiKey =
    process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        message:
          "KAKAO_REST_API_KEY 환경변수가 등록되지 않았습니다.",
      },
      {
        status: 500,
      },
    );
  }

  const { searchParams } =
    request.nextUrl;

  const mode =
    searchParams.get("mode");

  if (mode === "places") {
    return searchPlaces(
      searchParams,
      apiKey,
    );
  }

  if (mode === "routes") {
    return searchTransitRoutes(
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

  const kakaoParams =
    new URLSearchParams({
      query,
      size: "8",
      sort: "accuracy",
    });

  const response = await fetch(
    `${KAKAO_PLACE_API}?${kakaoParams.toString()}`,
    {
      headers: {
        Authorization:
          `KakaoAK ${apiKey}`,
      },
      cache: "no-store",
    },
  );

  const result = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        message:
          getKakaoErrorMessage(result),
      },
      {
        status: response.status,
      },
    );
  }

  return NextResponse.json({
    places: result.documents.map(
      (place: KakaoPlace) => ({
        id: place.id,
        name: place.place_name,
        address:
          place.road_address_name ||
          place.address_name,
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

  if (
    coordinates.some(
      (value) =>
        !value ||
        !Number.isFinite(Number(value)),
    )
  ) {
    return NextResponse.json(
      {
        message:
          "출발지와 도착지 좌표가 필요합니다.",
      },
      {
        status: 400,
      },
    );
  }

  const kakaoParams =
    new URLSearchParams({
      start_x: startX!,
      start_y: startY!,
      end_x: endX!,
      end_y: endY!,
      s_name:
        searchParams.get("startName") ||
        "출발",
      e_name:
        searchParams.get("endName") ||
        "도착",
      input_coord: "WGS84",
      output_coord: "WGS84",
    });

  const response = await fetch(
    `${KAKAO_TRANSIT_API}?${kakaoParams.toString()}`,
    {
      headers: {
        Authorization:
          `KakaoAK ${apiKey}`,
      },
      cache: "no-store",
    },
  );

  const result = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        message:
          getKakaoErrorMessage(result),
      },
      {
        status: response.status,
      },
    );
  }

  if (
    result.status !== "OK" ||
    !Array.isArray(result.routes)
  ) {
    return NextResponse.json({
      status: result.status,
      routes: [],
      landingUrl:
        result.properties?.landingURL ??
        null,
    });
  }

  return NextResponse.json({
    status: result.status,
    landingUrl:
      result.properties?.landingURL ??
      null,
    routes: result.routes
      .slice(0, 5)
      .map(
        (
          route: KakaoTransitRoute,
          index: number,
        ) => ({
          id: index,
          type:
            route.properties.type,
          totalDistance:
            route.properties
              .totalDistance,
          totalTime:
            route.properties.totalTime,
          transfers:
            route.properties.transfers,
          fare:
            route.properties.fare
              ?.value ?? null,
          steps: route.steps.map(
            (step) => ({
              type:
                step.properties.type,
              guidance:
                step.properties
                  .guidance,
              distance:
                step.properties
                  .distance,
              time:
                step.properties.time,
              vehicles:
                step.properties
                  .vehicles?.map(
                    (vehicle) =>
                      vehicle.name,
                  ) ?? [],
            }),
          ),
        }),
      ),
  });
}

function getKakaoErrorMessage(
  result: unknown,
) {
  if (
    typeof result === "object" &&
    result !== null &&
    "message" in result &&
    typeof result.message === "string"
  ) {
    return result.message;
  }

  return "카카오 API 요청에 실패했습니다.";
}

type KakaoPlace = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
};

type KakaoTransitRoute = {
  properties: {
    type:
      | "BUS"
      | "SUBWAY"
      | "BUS_AND_SUBWAY";
    totalDistance: number;
    totalTime: number;
    transfers: number;
    fare?: {
      value: number;
    };
  };
  steps: {
    properties: {
      type:
        | "BUS"
        | "SUBWAY"
        | "WALKING";
      guidance: string;
      distance: number;
      time: number;
      vehicles?: {
        name: string;
      }[];
    };
  }[];
};
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

const TAGO_NEARBY_STOP_API =
  "http://apis.data.go.kr/1613000/BusSttnInfoInqireService/getCrdntPrxmtSttnList";

const REPORT_RADIUS_METERS = 500;

type ReportKind =
  | "full_pass"
  | "dispatch_delay"
  | "transfer_failure";

type TagoStop = {
  nodeid?: string;
  nodenm?: string;
  nodeno?: string | number;
  citycode?: string | number;
  gpslati?: string | number;
  gpslong?: string | number;
};

type TagoResponse = {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?:
        | {
            item?: TagoStop | TagoStop[];
          }
        | "";
      totalCount?: number;
      pageNo?: number;
      numOfRows?: number;
    };
  };
};

type NearbyStop = {
  externalId: string;
  name: string;
  stopNumber: string | null;
  districtName: string | null;
  cityCode: string | null;
  latitude: number;
  longitude: number;
  distance: number;
};

type ReportBody = {
  externalId?: string;
  name?: string;
  stopNumber?: string | null;
  districtName?: string | null;
  cityCode?: string | null;
  latitude?: number;
  longitude?: number;
  userLatitude?: number;
  userLongitude?: number;
  kind?: ReportKind;
};

export const dynamic = "force-dynamic";

/**
 * 현재 위치 반경 500m의 버스정류장을 조회합니다.
 */
export async function GET(request: NextRequest) {
  const serviceKey =
    process.env.DATA_GO_KR_SERVICE_KEY?.trim();

  if (!serviceKey) {
    return NextResponse.json(
      {
        message:
          "DATA_GO_KR_SERVICE_KEY 환경변수가 설정되지 않았습니다.",
      },
      { status: 500 },
    );
  }

  const latitude = Number(
    request.nextUrl.searchParams.get("latitude"),
  );
  const longitude = Number(
    request.nextUrl.searchParams.get("longitude"),
  );

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return NextResponse.json(
      {
        message: "현재 위치 좌표가 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    serviceKey,
    pageNo: "1",
    numOfRows: "100",
    _type: "json",
    gpsLati: String(latitude),
    gpsLong: String(longitude),
  });

  try {
    const response = await fetch(
      `${TAGO_NEARBY_STOP_API}?${params.toString()}`,
      {
        cache: "no-store",
      },
    );

    const responseText = await response.text();

    if (response.status === 403) {
      console.error("[TAGO forbidden response]", responseText);

      throw new Error(
        "TAGO API가 요청을 거부했습니다. 활용신청 승인 상태와 인증키를 확인해 주세요.",
      );
    }

    if (!response.ok) {
      console.error("[TAGO HTTP error]", {
        status: response.status,
        responseText,
      });

      throw new Error(
        `TAGO API 요청에 실패했습니다. (${response.status})`,
      );
    }

    const result = parseTagoResponse(responseText);

    const resultCode =
      result.response?.header?.resultCode;

    const resultMessage =
      result.response?.header?.resultMsg;

    if (resultCode !== "00") {
      throw new Error(
        resultMessage ||
          `TAGO API 오류가 발생했습니다. (${resultCode ?? "UNKNOWN"})`,
      );
    }

    const rawItems = result.response?.body?.items;

    const itemValue =
      rawItems && typeof rawItems === "object"
        ? rawItems.item
        : undefined;

    const items = Array.isArray(itemValue)
      ? itemValue
      : itemValue
        ? [itemValue]
        : [];

    const nearbyStops: NearbyStop[] = items
      .map((stop): NearbyStop | null => {
        const externalId = String(stop.nodeid ?? "").trim();
        const name = String(stop.nodenm ?? "").trim();
        const cityCode = String(stop.citycode ?? "").trim();
        const stopLatitude = Number(stop.gpslati);
        const stopLongitude = Number(stop.gpslong);

        if (
          !externalId ||
          !name ||
          !isValidLatitude(stopLatitude) ||
          !isValidLongitude(stopLongitude)
        ) {
          return null;
        }

        const distance = calculateDistanceMeters(
          latitude,
          longitude,
          stopLatitude,
          stopLongitude,
        );

        return {
          externalId: `tago:${externalId}`,
          name,
          stopNumber:
            Number(stop.nodeno) > 0
              ? String(stop.nodeno)
              : null,
          districtName: null,
          cityCode: cityCode || null,
          latitude: stopLatitude,
          longitude: stopLongitude,
          distance,
        };
      })
      .filter((stop): stop is NearbyStop => stop !== null)
      .filter((stop) => stop.distance <= REPORT_RADIUS_METERS)
      .sort((first, second) => first.distance - second.distance);

    return NextResponse.json({
      radius: REPORT_RADIUS_METERS,
      stops: nearbyStops,
    });
  } catch (error) {
    console.error("[TAGO nearby stop API error]", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "주변 버스정류장을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}

/**
 * 선택한 정류장을 Supabase에 등록하고 익명 신고를 저장합니다.
 */
export async function POST(request: NextRequest) {
  let body: ReportBody;

  try {
    body = (await request.json()) as ReportBody;
  } catch {
    return NextResponse.json(
      {
        message: "신고 요청 형식이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const {
    externalId,
    name,
    stopNumber,
    districtName,
    cityCode,
    latitude,
    longitude,
    userLatitude,
    userLongitude,
    kind,
  } = body;

  if (!externalId || !name) {
    return NextResponse.json(
      {
        message: "선택한 정류장 정보가 누락되었습니다.",
      },
      { status: 400 },
    );
  }

  if (
    !isValidLatitude(latitude) ||
    !isValidLongitude(longitude) ||
    !isValidLatitude(userLatitude) ||
    !isValidLongitude(userLongitude)
  ) {
    return NextResponse.json(
      {
        message: "위치 정보가 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  if (!isReportKind(kind)) {
    return NextResponse.json(
      {
        message: "신고 유형이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const distance = calculateDistanceMeters(
    userLatitude,
    userLongitude,
    latitude,
    longitude,
  );

  if (distance > REPORT_RADIUS_METERS) {
    return NextResponse.json(
      {
        message:
          "정류장 반경 500m 이내에서만 신고할 수 있습니다.",
      },
      { status: 400 },
    );
  }

  try {
    const { data: stop, error: stopError } = await supabaseAdmin
      .from("transit_stops")
      .upsert(
        {
          external_id: externalId,
          city_code: cityCode || null,
          name,
          stop_number: stopNumber || null,
          district_name: districtName || null,
          location: `POINT(${longitude} ${latitude})`,
          source: "TAGO",
        },
        {
          onConflict: "external_id",
        },
      )
      .select("id")
      .single();

    if (stopError || !stop) {
      console.error("[Transit stop upsert error]", stopError);

      return NextResponse.json(
        {
          message:
            stopError?.message ??
            "선택한 정류장을 DB에 저장하지 못했습니다.",
        },
        { status: 500 },
      );
    }

    const { data: reportId, error: reportError } =
      await supabaseAdmin.rpc("submit_anonymous_report", {
        p_stop_id: stop.id,
        p_kind: kind,
        p_lat: userLatitude,
        p_lng: userLongitude,
        p_route_number: null,
      });

    if (reportError) {
      console.error("[Anonymous report error]", reportError);

      return NextResponse.json(
        {
          message: reportError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      reportId,
      stopId: stop.id,
      reportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Anonymous report save error]", error);

    return NextResponse.json(
      {
        message:
          "익명 신고를 DB에 저장하는 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

function parseTagoResponse(responseText: string): TagoResponse {
  if (!responseText.trim()) {
    throw new Error("TAGO API가 빈 응답을 반환했습니다.");
  }

  try {
    return JSON.parse(responseText) as TagoResponse;
  } catch {
    const authMessage =
      extractXmlValue(responseText, "returnAuthMsg") ||
      extractXmlValue(responseText, "errMsg");

    if (authMessage) {
      throw new Error(`TAGO API 인증 오류: ${authMessage}`);
    }

    const xmlResult = parseTagoXmlResponse(responseText);

    if (xmlResult) {
      return xmlResult;
    }

    console.error("[TAGO unknown response]", responseText);

    throw new Error(
      `TAGO API가 알 수 없는 응답을 반환했습니다: ${responseText.slice(0, 100)}`,
    );
  }
}

function parseTagoXmlResponse(xml: string): TagoResponse | null {
  if (!xml.includes("<response")) {
    return null;
  }

  const resultCode = extractXmlValue(xml, "resultCode");
  const resultMsg = extractXmlValue(xml, "resultMsg");
  const totalCount = Number(
    extractXmlValue(xml, "totalCount") || "0",
  );
  const pageNo = Number(
    extractXmlValue(xml, "pageNo") || "1",
  );
  const numOfRows = Number(
    extractXmlValue(xml, "numOfRows") || "0",
  );

  const itemMatches =
    xml.match(/<item>([\s\S]*?)<\/item>/gi) ?? [];

  const items: TagoStop[] = itemMatches.map((itemXml) => ({
    nodeid: extractXmlValue(itemXml, "nodeid"),
    nodenm: decodeXmlText(
      extractXmlValue(itemXml, "nodenm"),
    ),
    citycode: extractXmlValue(itemXml, "citycode"),
    gpslati: extractXmlValue(itemXml, "gpslati"),
    gpslong: extractXmlValue(itemXml, "gpslong"),
  }));

  return {
    response: {
      header: {
        resultCode,
        resultMsg,
      },
      body: {
        items:
          items.length > 0
            ? {
                item: items,
              }
            : "",
        totalCount,
        pageNo,
        numOfRows,
      },
    },
  };
}

function extractXmlValue(xml: string, tagName: string) {
  const expression = new RegExp(
    `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "i",
  );

  const match = xml.match(expression);

  return match?.[1]?.trim() ?? "";
}

function decodeXmlText(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function isReportKind(value: unknown): value is ReportKind {
  return (
    value === "full_pass" ||
    value === "dispatch_delay" ||
    value === "transfer_failure"
  );
}

function isValidLatitude(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= -90 &&
    value <= 90
  );
}

function isValidLongitude(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= -180 &&
    value <= 180
  );
}

function calculateDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) {
  const earthRadius = 6371000;
  const latitudeDelta = toRadians(latitude2 - latitude1);
  const longitudeDelta = toRadians(longitude2 - longitude1);
  const firstLatitude = toRadians(latitude1);
  const secondLatitude = toRadians(latitude2);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    earthRadius *
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine),
    )
  );
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
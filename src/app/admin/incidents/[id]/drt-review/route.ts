import {
  NextResponse,
} from "next/server";

import {
  DRT_RULE_CONFIG,
  evaluateDrtRule,
  type NearbyIncidentInput,
} from "@/lib/drt-rule-engine";
import {
  getCurrentUser,
} from "@/lib/auth";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type IncidentRow = {
  id: number;
  stop_id: number;

  kind:
    | "full_pass"
    | "dispatch_delay"
    | "transfer_failure";

  severity:
    | "low"
    | "medium"
    | "high";

  report_count: number;
  window_ended_at: string;
};

type StopLocation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "로그인이 필요합니다.",
        },
        {
          status: 401,
        },
      );
    }

    if (
      user.role !== "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "관리자만 똑버스 검토안을 생성할 수 있습니다.",
        },
        {
          status: 403,
        },
      );
    }

    const { id } =
      await context.params;

    const incidentId =
      Number(id);

    if (
      !Number.isInteger(
        incidentId,
      ) ||
      incidentId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "올바르지 않은 사건 번호입니다.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      await createClient();

    const {
      data: centerIncident,
      error: centerError,
    } = await supabase
      .from("incidents")
      .select(
        `
          id,
          stop_id,
          kind,
          severity,
          report_count,
          window_ended_at
        `,
      )
      .eq("id", incidentId)
      .single();

    if (
      centerError ||
      !centerIncident
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "기준 교통 사건을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const {
      data: centerStop,
      error: stopError,
    } = await supabase
      .from("transit_stop_map")
      .select(
        `
          id,
          name,
          latitude,
          longitude
        `,
      )
      .eq(
        "id",
        centerIncident.stop_id,
      )
      .single();

    if (
      stopError ||
      !centerStop
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "기준 정류장의 위치 정보를 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const windowStart =
      new Date(
        Date.now() -
          DRT_RULE_CONFIG.timeWindowMinutes *
            60 *
            1000,
      ).toISOString();

    const {
      data: activeIncidents,
      error: incidentsError,
    } = await supabase
      .from("incidents")
      .select(
        `
          id,
          stop_id,
          kind,
          severity,
          report_count,
          window_ended_at
        `,
      )
      .gte(
        "window_ended_at",
        windowStart,
      )
      .neq(
        "status",
        "resolved",
      );

    if (incidentsError) {
      throw new Error(
        `주변 사건 조회 실패: ${incidentsError.message}`,
      );
    }

    const incidents =
      (activeIncidents ??
        []) as IncidentRow[];

    const stopIds = [
      ...new Set(
        incidents.map(
          (incident) =>
            incident.stop_id,
        ),
      ),
    ];

    const {
      data: stopLocations,
      error:
        stopLocationsError,
    } =
      stopIds.length === 0
        ? {
            data:
              [] as StopLocation[],
            error: null,
          }
        : await supabase
            .from(
              "transit_stop_map",
            )
            .select(
              `
                id,
                name,
                latitude,
                longitude
              `,
            )
            .in("id", stopIds);

    if (
      stopLocationsError
    ) {
      throw new Error(
        `주변 정류장 위치 조회 실패: ${stopLocationsError.message}`,
      );
    }

    const locationMap =
      new Map(
        (
          (stopLocations ??
            []) as StopLocation[]
        ).map((stop) => [
          stop.id,
          stop,
        ]),
      );

    const nearbyIncidents:
      NearbyIncidentInput[] =
      incidents
        .map((incident) => {
          const location =
            locationMap.get(
              incident.stop_id,
            );

          if (!location) {
            return null;
          }

          const distanceKm =
            calculateDistanceKm(
              centerStop.latitude,
              centerStop.longitude,
              location.latitude,
              location.longitude,
            );

          return {
            id: incident.id,
            kind:
              incident.kind,
            severity:
              incident.severity,
            reportCount:
              incident.report_count,
            distanceKm,
            occurredAt:
              incident.window_ended_at,
          };
        })
        .filter(
          (
            incident,
          ): incident is NearbyIncidentInput =>
            incident !== null,
        );

    const result =
      evaluateDrtRule({
        centerStopId:
          centerStop.id,

        centerStopName:
          centerStop.name,

        latitude:
          centerStop.latitude,

        longitude:
          centerStop.longitude,

        nearbyIncidents,
      });

    if (!result.eligible) {
      return NextResponse.json({
        success: true,
        created: false,
        message:
          "현재 사건은 똑버스 호출 검토 기준을 충족하지 않았습니다.",
        result,
      });
    }

    const {
      data: existingAction,
    } = await supabase
      .from("ai_actions")
      .select(
        `
          id,
          status,
          title,
          content,
          payload,
          created_at
        `,
      )
      .eq(
        "incident_id",
        incidentId,
      )
      .eq(
        "action_type",
        "drt_recommendation",
      )
      .in("status", [
        "draft",
        "pending_review",
        "approved",
      ])
      .maybeSingle();

    if (existingAction) {
      return NextResponse.json({
        success: true,
        created: false,
        message:
          "이미 생성된 똑버스 검토안이 있습니다.",
        action:
          existingAction,
        result,
      });
    }

    const {
      data: action,
      error: insertError,
    } = await supabase
      .from("ai_actions")
      .insert({
        incident_id:
          incidentId,

        action_type:
          "drt_recommendation",

        status:
          "pending_review",

        title:
          result.title,

        content:
          result.reason,

        payload: {
          ruleResult:
            result,

          isPrototype:
            true,

          actualDispatch:
            false,

          generatedAt:
            new Date().toISOString(),
        },
      })
      .select(
        `
          id,
          status,
          title,
          content,
          payload,
          created_at
        `,
      )
      .single();

    if (
      insertError ||
      !action
    ) {
      throw new Error(
        `똑버스 검토안 저장 실패: ${insertError?.message ?? "저장 결과 없음"}`,
      );
    }

    return NextResponse.json({
      success: true,
      created: true,
      message:
        "똑버스 호출 검토안이 관리자 대기함에 등록되었습니다.",
      action,
      result,
    });
  } catch (error) {
    console.error(
      "[DRT review creation error]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "똑버스 검토안 생성 중 오류가 발생했습니다.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      },
    );
  }
}

function calculateDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusKm =
    6371;

  const latitudeDifference =
    toRadians(
      latitudeB -
        latitudeA,
    );

  const longitudeDifference =
    toRadians(
      longitudeB -
        longitudeA,
    );

  const startLatitude =
    toRadians(latitudeA);

  const endLatitude =
    toRadians(latitudeB);

  const haversine =
    Math.sin(
      latitudeDifference / 2,
    ) ** 2 +
    Math.cos(
      startLatitude,
    ) *
      Math.cos(
        endLatitude,
      ) *
      Math.sin(
        longitudeDifference /
          2,
      ) **
        2;

  return (
    earthRadiusKm *
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(
        1 - haversine,
      ),
    )
  );
}

function toRadians(
  value: number,
) {
  return (
    value *
    (Math.PI / 180)
  );
}
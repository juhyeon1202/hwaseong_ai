import { NextResponse } from "next/server";

import {
  GEMINI_MODEL,
  generateGeminiJson,
} from "@/lib/gemini";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  route_number: string | null;
  window_started_at: string;
  window_ended_at: string;
  report_count: number;
  severity:
    | "low"
    | "medium"
    | "high";
  status:
    | "detected"
    | "reviewing"
    | "notified"
    | "resolved";
  evidence:
    | Record<string, unknown>
    | null;
  transit_stops:
    | {
        name: string;
        stop_number: string | null;
        district_name: string | null;
      }
    | {
        name: string;
        stop_number: string | null;
        district_name: string | null;
      }[]
    | null;
};

type GeminiIncidentAnalysis = {
  summary: string;
  citizenGuidance: string;
  adminRecommendation: string;
  riskLevel:
    | "low"
    | "medium"
    | "high";
  drtReviewNeeded: boolean;
  drtReviewReason: string | null;
  evidenceLimitations: string;
};

const reportKindLabels = {
  full_pass: "만차 통과",
  dispatch_delay: "배차 지연",
  transfer_failure: "환승 실패",
} as const;

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

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message:
            "관리자만 사건을 분석할 수 있습니다.",
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
            "올바르지 않은 사건 ID입니다.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      await createClient();

    const {
      data,
      error: incidentError,
    } = await supabase
      .from("incidents")
      .select(
        `
          id,
          stop_id,
          kind,
          route_number,
          window_started_at,
          window_ended_at,
          report_count,
          severity,
          status,
          evidence,
          transit_stops (
            name,
            stop_number,
            district_name
          )
        `,
      )
      .eq("id", incidentId)
      .single();

    if (
      incidentError ||
      !data
    ) {
      console.error(
        "[Incident read error]",
        incidentError,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "분석할 교통 사건을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const incident =
      data as IncidentRow;

    const stop =
      Array.isArray(
        incident.transit_stops,
      )
        ? incident
            .transit_stops[0]
        : incident.transit_stops;

    const analysisInput = {
      incidentId:
        incident.id,

      stopName:
        stop?.name ??
        "정류장 정보 없음",

      stopNumber:
        stop?.stop_number ??
        "정류장 번호 없음",

      districtName:
        stop?.district_name ??
        "행정구역 정보 없음",

      reportKind:
        reportKindLabels[
          incident.kind
        ],

      routeNumber:
        incident.route_number ??
        "노선 미지정",

      reportCount:
        incident.report_count,

      currentSeverity:
        incident.severity,

      windowStartedAt:
        incident.window_started_at,

      windowEndedAt:
        incident.window_ended_at,

      evidence:
        incident.evidence ??
        {},
    };

    const analysis =
      await generateGeminiJson<GeminiIncidentAnalysis>(
        {
          systemInstruction: [
            "당신은 화성시 교통 문제를 분석하는 관리자 지원 AI입니다.",
            "제공된 익명 집계 데이터만 근거로 판단합니다.",
            "개인정보나 제공되지 않은 사실을 추측하지 않습니다.",
            "똑버스 호출은 절대로 자동 확정하지 않고 관리자 검토 대상으로만 제안합니다.",
            "JSON 이외의 설명이나 마크다운을 출력하지 않습니다.",
          ].join(" "),

          prompt: `
다음 교통 사건을 분석하세요.

${JSON.stringify(
  analysisInput,
  null,
  2,
)}

반드시 다음 JSON 구조로만 응답하세요.

{
  "summary": "교통 사건 현황을 설명하는 2~3문장",
  "citizenGuidance": "시민에게 제공할 수 있는 안전하고 간단한 안내",
  "adminRecommendation": "관리자가 확인하거나 처리해야 할 권장 조치",
  "riskLevel": "low 또는 medium 또는 high",
  "drtReviewNeeded": true 또는 false,
  "drtReviewReason": "똑버스 호출 검토가 필요한 이유 또는 null",
  "evidenceLimitations": "현재 데이터만으로 판단할 수 없는 사항"
}

판단 기준:
- 신고 수가 적거나 정보가 부족하면 과장하지 않습니다.
- 동일 정류장에서 짧은 시간 동안 신고가 집중되면 우선 확인 대상으로 봅니다.
- 배차 지연이나 만차 통과가 반복된 경우 대체 교통수단 검토를 제안할 수 있습니다.
- 똑버스 검토 여부는 제안일 뿐이며 최종 결정은 관리자가 합니다.
          `.trim(),
        },
      );

    validateAnalysis(
      analysis,
    );

    const nextEvidence = {
      ...(incident.evidence ??
        {}),

      aiAnalysis: {
        riskLevel:
          analysis.riskLevel,

        drtReviewNeeded:
          analysis.drtReviewNeeded,

        drtReviewReason:
          analysis.drtReviewReason,

        evidenceLimitations:
          analysis.evidenceLimitations,

        generatedAt:
          new Date().toISOString(),

        model:
          GEMINI_MODEL,
      },
    };

    const {
      data: updatedIncident,
      error: updateError,
    } = await supabase
      .from("incidents")
      .update({
        ai_summary:
          analysis.summary,

        citizen_guidance:
          analysis.citizenGuidance,

        admin_recommendation:
          analysis.adminRecommendation,

        evidence:
          nextEvidence,

        model_name:
          GEMINI_MODEL,

        requires_review:
          true,

        status:
          incident.status ===
          "detected"
            ? "reviewing"
            : incident.status,
      })
      .eq("id", incidentId)
      .select(
        `
          id,
          ai_summary,
          citizen_guidance,
          admin_recommendation,
          evidence,
          model_name,
          requires_review,
          status,
          updated_at
        `,
      )
      .single();

    if (
      updateError ||
      !updatedIncident
    ) {
      console.error(
        "[Incident AI update error]",
        updateError,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "AI 분석 결과를 저장하지 못했습니다.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "AI 사건 분석이 완료되었습니다.",
      incident:
        updatedIncident,
      analysis,
    });
  } catch (error) {
    console.error(
      "[Incident AI analyze error]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "AI 사건 분석 중 알 수 없는 오류가 발생했습니다.";

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

function validateAnalysis(
  value: GeminiIncidentAnalysis,
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      "AI 분석 결과의 형식이 올바르지 않습니다.",
    );
  }

  const requiredTexts = [
    value.summary,
    value.citizenGuidance,
    value.adminRecommendation,
    value.evidenceLimitations,
  ];

  if (
    requiredTexts.some(
      (item) =>
        typeof item !==
          "string" ||
        item.trim().length === 0,
    )
  ) {
    throw new Error(
      "AI 분석 결과에 필요한 설명이 누락되었습니다.",
    );
  }

  if (
    ![
      "low",
      "medium",
      "high",
    ].includes(value.riskLevel)
  ) {
    throw new Error(
      "AI 위험도 값이 올바르지 않습니다.",
    );
  }

  if (
    typeof value.drtReviewNeeded !==
    "boolean"
  ) {
    throw new Error(
      "똑버스 검토 여부 값이 올바르지 않습니다.",
    );
  }

  if (
    value.drtReviewNeeded &&
    (
      typeof value.drtReviewReason !==
        "string" ||
      value.drtReviewReason
        .trim()
        .length === 0
    )
  ) {
    throw new Error(
      "똑버스 검토 사유가 누락되었습니다.",
    );
  }
}
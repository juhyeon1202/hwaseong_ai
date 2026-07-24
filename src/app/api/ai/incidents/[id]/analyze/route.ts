import { NextResponse } from "next/server";

import {
  GEMINI_SEARCH_MODEL,
  generateGeminiSearchJson,
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
  nearbyContext: string;
  externalEvidence: string[];
  sources: {
    title: string;
    url: string;
  }[];
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
      await generateGeminiSearchJson<GeminiIncidentAnalysis>(
        {
          systemInstruction: [
            "당신은 화성시 교통 문제를 분석하는 관리자 지원 AI입니다.",
            "내부 익명 신고 집계와 Google 검색으로 확인한 공개 자료를 교차 분석합니다.",
            "검색은 반드시 교통 운영 정보, 도로 소통 정보, 기상 정보, 지역 뉴스의 네 영역으로 나누어 수행합니다.",
            "현재 시각과 가까운 공식 기관·지자체·교통기관 자료를 우선하고 뉴스는 보조 근거로만 사용합니다.",
            "출처 URL과 게시 또는 갱신 시각을 확인할 수 없는 내용은 현재 상황의 근거로 채택하지 않습니다.",
            "정류장명, 정류장 번호, 행정구역이 일치하지 않는 검색 결과는 근거로 사용하지 않습니다.",
            "확인된 사실과 가능성 또는 추정을 명확히 구분합니다.",
            "개인정보나 확인되지 않은 사실을 생성하지 않습니다.",
            "똑버스 호출은 절대로 자동 확정하지 않고 관리자 검토 대상으로만 제안합니다.",
            "JSON 이외의 설명이나 마크다운을 출력하지 않습니다.",
          ].join(" "),

          prompt: `
현재 시각은 ${new Date().toISOString()}입니다.

다음 교통 사건을 분석하세요.

${JSON.stringify(
  analysisInput,
  null,
  2,
)}

반드시 다음 JSON 구조로만 응답하세요.

{
  "summary": "내부 신고 추이와 확인된 외부 교통 상황을 구분하여 설명하는 3~5문장",
  "citizenGuidance": "발생 위치, 기준 시각, 예상 영향, 시민이 취할 행동과 다음 확인 방법을 포함한 안내문",
  "adminRecommendation": "확인 순서와 조건별 대응을 포함한 관리자 권장 조치",
  "nearbyContext": "정류장 또는 행정구역 주변의 최근 사고, 공사, 통제, 정체, 대중교통 운행 장애, 기상 상황 중 검색으로 확인된 내용. 없으면 확인된 외부 정보 없음",
  "externalEvidence": ["외부 검색으로 확인한 판단 근거"],
  "sources": [{"title": "출처 제목", "url": "https://..."}],
  "riskLevel": "low 또는 medium 또는 high",
  "drtReviewNeeded": true 또는 false,
  "drtReviewReason": "똑버스 호출 검토가 필요한 이유 또는 null",
  "evidenceLimitations": "현재 데이터만으로 판단할 수 없는 사항"
}

판단 기준:
- 아래 순서대로 서로 다른 검색어를 사용해 최소 네 영역을 확인합니다.
  1. 대중교통: 정류장명·정류장 번호·노선번호와 함께 경기버스정보(GBIS), 화성시 교통정보, 버스 운행 장애·우회·배차 공지를 검색합니다.
  2. 도로 상황: 행정구역·인접 도로명과 함께 국가교통정보센터(ITS/UTIC), 경기도 교통정보, 화성시 도로 공사·사고·통제·정체 정보를 검색합니다.
  3. 기상·재난: 기상청 날씨누리, 기상특보, 안전디딤돌·재난문자를 우선하여 강수, 폭염, 강풍, 대설, 안개 등 운행에 영향을 줄 수 있는 정보를 검색합니다.
  4. 지역 뉴스: 화성시 또는 해당 행정구역과 정류장·도로·버스 키워드로 최근 24시간을 우선 검색하고, 결과가 없을 때만 최근 7일까지 확장합니다.
- 외부 정보마다 내부 신고와의 공간적 관련성, 시간적 관련성, 신고 유형과의 인과 가능성을 각각 판단합니다.
- 날씨가 평상 범위이거나 사건과 무관하면 원인으로 연결하지 말고, 관련 기상 정보가 없다고 명시합니다.
- 뉴스 기사만 존재하고 공식 기관 확인이 없으면 "언론 보도 기준, 공식 확인 필요"로 표시합니다.
- 검색 결과의 작성일 또는 갱신 시각을 확인하고 오래된 정보는 현재 상황의 근거로 사용하지 않습니다.
- sources에는 실제 분석에 사용한 URL만 최대 6개를 넣고, 제목에 기관명과 확인 시각을 함께 적습니다.
- externalEvidence에는 각 근거별로 "무엇을 확인했는지 / 내부 신고와 어떤 관련이 있는지 / 신뢰 수준"을 한 문장으로 작성합니다.
- nearbyContext에는 확인된 주변 교통·도로·기상·뉴스 정보를 항목별로 나누어 4~8문장으로 종합합니다.
- summary에는 내부 신고 사실, 외부 확인 사실, 두 정보의 일치 여부, 현재 판단을 순서대로 포함합니다.
- citizenGuidance에는 기준 시각, 영향 구간, 이용자가 확인할 공식 채널, 우회 또는 대체 행동, 다음 갱신 예정 기준을 포함합니다.
- adminRecommendation에는 즉시 확인, 30분 이내 확인, 지속 시 조치의 세 단계로 구체적인 담당 확인 대상을 제안합니다.
- 공식적인 외부 정보가 없으면 nearbyContext에 "확인된 외부 정보 없음"이라고 작성하고 sources는 빈 배열로 반환합니다.
- 웹 검색 결과만으로 반경 3km를 정확히 확인할 수 없다면 반경 내 사실로 단정하지 않습니다.
- 시민 안내문에는 확인되지 않은 원인을 사실처럼 작성하지 않습니다.
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
          GEMINI_SEARCH_MODEL,

        nearbyContext:
          analysis.nearbyContext,

        externalEvidence:
          analysis.externalEvidence,

        sources:
          analysis.sources,
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
          GEMINI_SEARCH_MODEL,

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
    value.nearbyContext,
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
    !Array.isArray(
      value.externalEvidence,
    ) ||
    !Array.isArray(
      value.sources,
    ) ||
    value.sources.some(
      (source) =>
        !source ||
        typeof source.title !==
          "string" ||
        typeof source.url !==
          "string",
    )
  ) {
    throw new Error(
      "AI 외부 교통 근거의 형식이 올바르지 않습니다.",
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

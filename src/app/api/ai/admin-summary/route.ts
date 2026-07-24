import { NextResponse } from "next/server";

import {
  GEMINI_SEARCH_MODEL,
  generateGeminiSearchText,
} from "@/lib/gemini";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StopReportSummary = {
  stop_name: string;
  stop_number: string | null;
  district_name: string | null;
  kind:
    | "full_pass"
    | "dispatch_delay"
    | "transfer_failure";
  route_number: string | null;
  report_count: number;
  latest_report_at: string;
};

const reportKindLabels = {
  full_pass: "만차 통과",
  dispatch_delay: "배차 지연",
  transfer_failure: "환승 실패",
} as const;

export async function GET() {
  try {
    // 관리자 권한 확인
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "로그인이 필요합니다.",
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
          message: "관리자만 사용할 수 있는 기능입니다.",
        },
        {
          status: 403,
        },
      );
    }

    const supabase = await createClient();

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const [
      todayReportsResult,
      activeIncidentsResult,
      reviewIncidentsResult,
      waitingInquiriesResult,
      openRouteRequestsResult,
      stopReportsResult,
    ] = await Promise.all([
      // 오늘 접수된 익명 정류장 신고
      supabase
        .from("anonymous_reports")
        .select("*", {
          count: "exact",
          head: true,
        })
        .gte(
          "occurred_at",
          today.toISOString(),
        ),

      // 아직 해결되지 않은 교통 사건
      supabase
        .from("incidents")
        .select("*", {
          count: "exact",
          head: true,
        })
        .neq("status", "resolved"),

      // 관리자 검토가 필요한 사건
      supabase
        .from("incidents")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("requires_review", true)
        .in("status", [
          "detected",
          "reviewing",
        ]),

      // 답변 대기 중인 문의
      supabase
        .from("inquiries")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "waiting"),

      // 검토 중인 희망 노선 제안
      supabase
        .from("route_requests")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "open"),

      // 최근 10분 동안 신고가 집중된 정류장
      supabase
        .from("stop_report_10m")
        .select(
          `
            stop_name,
            stop_number,
            district_name,
            kind,
            route_number,
            report_count,
            latest_report_at
          `,
        )
        .order("report_count", {
          ascending: false,
        })
        .limit(10),
    ]);

    const queryErrors = [
      todayReportsResult.error,
      activeIncidentsResult.error,
      reviewIncidentsResult.error,
      waitingInquiriesResult.error,
      openRouteRequestsResult.error,
      stopReportsResult.error,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      console.error(
        "[Admin AI summary database error]",
        queryErrors,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "관리자 현황 데이터를 불러오지 못했습니다.",
        },
        {
          status: 500,
        },
      );
    }

    const stopReports =
      (stopReportsResult.data ??
        []) as StopReportSummary[];

    const metrics = {
      todayReportCount:
        todayReportsResult.count ?? 0,

      activeIncidentCount:
        activeIncidentsResult.count ?? 0,

      reviewIncidentCount:
        reviewIncidentsResult.count ?? 0,

      waitingInquiryCount:
        waitingInquiriesResult.count ?? 0,

      openRouteRequestCount:
        openRouteRequestsResult.count ?? 0,

      concentratedStops: stopReports.map(
        (report) => ({
          stopName: report.stop_name,
          stopNumber:
            report.stop_number ??
            "정류장 번호 없음",
          districtName:
            report.district_name ??
            "행정구역 정보 없음",
          reportKind:
            reportKindLabels[
              report.kind
            ],
          routeNumber:
            report.route_number ??
            "노선 미지정",
          reportCount:
            report.report_count,
          latestReportAt:
            report.latest_report_at,
        }),
      ),
    };

    const summary =
      await generateGeminiSearchText({
        systemInstruction: [
          "당신은 화성시 시민 참여형 교통 플랫폼의 관리자 지원 AI입니다.",
          "내부 집계 데이터와 Google 검색으로 확인한 최신 공개 교통 자료를 교차 분석합니다.",
          "공식 기관, 지자체, 교통기관의 최신 자료를 우선 사용합니다.",
          "화성시와 관련 없는 동명의 장소 또는 오래된 자료는 현재 상황의 근거로 사용하지 않습니다.",
          "확인된 사실과 추정을 명확하게 구분합니다.",
          "개인정보를 추측하거나 생성하지 않습니다.",
          "신고가 적거나 없는 경우 심각한 상황처럼 과장하지 않습니다.",
          "똑버스 호출이나 행정 조치는 자동 실행하지 않고 관리자 검토가 필요한 제안으로만 작성합니다.",
          "답변은 한국어로 작성합니다.",
        ].join(" "),

        prompt: `
현재 시각은 ${new Date().toISOString()}입니다.

다음은 현재 관리자 교통 현황 집계 데이터입니다.

${JSON.stringify(metrics, null, 2)}

집중 신고 정류장과 행정구역을 기준으로 다음 공개 정보를 검색하세요.
- 최근 교통사고, 도로 공사, 도로 통제와 정체
- 버스 운행 장애 또는 대중교통 관련 공식 안내
- 현재 강수, 기상특보 등 교통에 영향을 줄 수 있는 기상 상황

검색 정보가 내부 신고와 직접 관련된다고 확인할 수 없으면 원인으로 단정하지 마세요.
검색 결과가 없으면 "관련 외부 정보가 확인되지 않았습니다."라고 작성하세요.

아래 형식을 반드시 지켜서 작성하세요.

[핵심 변화]
단순 건수 반복이 아니라 신고 집중 위치, 유형, 최신 시각과 우선순위를 2~4문장으로 분석합니다.

[외부 교통 근거]
검색으로 확인한 사고, 공사, 통제, 정체, 대중교통 운행 또는 기상 정보를 최대 3개 작성합니다.
각 항목에는 확인 시각과 출처 이름을 포함합니다.
확인된 정보가 없으면 그 사실을 명시합니다.

[우선 확인]
관리자가 먼저 확인해야 하는 위치와 이유를 우선순위 순으로 최대 3개 작성합니다.
확인할 사항이 없으면 "긴급 확인이 필요한 항목이 없습니다."라고 작성합니다.

[권장 조치]
즉시 확인, 시민 안내, 지속 감시 등 관리자가 검토할 대응을 조건과 함께 최대 3개 작성합니다.
똑버스 호출이 필요해 보이는 경우에도 반드시 "똑버스 호출 검토"라고만 표현합니다.

[시민 안내 초안]
위치, 기준 시각, 예상 영향, 시민 행동 방법을 포함한 2~4문장의 안내문을 작성합니다.

[분석 한계]
내부 신고와 외부 검색 자료만으로 확인할 수 없는 내용을 명시합니다.

[참고 출처]
실제로 판단에 사용한 웹 자료의 제목과 URL만 작성합니다. 사용한 자료가 없으면 "없음"이라고 작성합니다.
        `.trim(),
      });

    return NextResponse.json({
      success: true,
      model: GEMINI_SEARCH_MODEL,
      generatedAt:
        new Date().toISOString(),
      metrics,
      summary,
    });
  } catch (error) {
    console.error(
      "[Admin AI summary error]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "AI 관리자 요약 생성 중 알 수 없는 오류가 발생했습니다.";

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

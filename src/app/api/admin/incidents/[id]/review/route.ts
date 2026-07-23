import {
  NextResponse,
} from "next/server";

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

type ReviewBody = {
  decision?:
    | "approve"
    | "reject";
};

export async function POST(
  request: Request,
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
            "관리자만 분석 결과를 검토할 수 있습니다.",
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

    let body: ReviewBody;

    try {
      body =
        (await request.json()) as ReviewBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "요청 데이터가 올바르지 않습니다.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.decision !==
        "approve" &&
      body.decision !== "reject"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "승인 또는 반려 결과가 필요합니다.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      await createClient();

    const {
      data: incident,
      error: incidentError,
    } = await supabase
      .from("incidents")
      .select(
        `
          id,
          status,
          requires_review,
          ai_summary,
          citizen_guidance,
          admin_recommendation
        `,
      )
      .eq("id", incidentId)
      .single();

    if (
      incidentError ||
      !incident
    ) {
      console.error(
        "[Incident review read error]",
        incidentError,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "검토할 교통 사건을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      !incident.ai_summary ||
      !incident.citizen_guidance ||
      !incident.admin_recommendation
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "먼저 AI 사건 분석을 실행해야 합니다.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      body.decision ===
      "approve"
    ) {
      return approveAnalysis({
        incidentId,
        userId: user.id,
        aiSummary:
          incident.ai_summary,
        citizenGuidance:
          incident.citizen_guidance,
        adminRecommendation:
          incident.admin_recommendation,
      });
    }

    return rejectAnalysis({
      incidentId,
      userId: user.id,
      aiSummary:
        incident.ai_summary,
      adminRecommendation:
        incident.admin_recommendation,
    });
  } catch (error) {
    console.error(
      "[Incident review error]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "AI 분석 검토 중 오류가 발생했습니다.";

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

async function approveAnalysis({
  incidentId,
  userId,
  aiSummary,
  citizenGuidance,
  adminRecommendation,
}: {
  incidentId: number;
  userId: string;
  aiSummary: string;
  citizenGuidance: string;
  adminRecommendation: string;
}) {
  const supabase =
    await createClient();

  const now =
    new Date().toISOString();

  const {
    error: updateError,
  } = await supabase
    .from("incidents")
    .update({
      status: "notified",
      requires_review: false,
    })
    .eq("id", incidentId);

  if (updateError) {
    console.error(
      "[Incident approve update error]",
      updateError,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          `사건 승인 상태를 저장하지 못했습니다: ${updateError.message}`,
      },
      {
        status: 500,
      },
    );
  }

  const {
    error: actionError,
  } = await supabase
    .from("ai_actions")
    .insert({
      incident_id:
        incidentId,

      action_type:
        "citizen_alert",

      status:
        "simulated",

      title:
        "AI 교통 사건 분석 승인",

      content:
        citizenGuidance,

      payload: {
        aiSummary,
        adminRecommendation,
        isPrototype: true,
      },

      reviewed_by:
        userId,

      reviewed_at:
        now,

      executed_at:
        now,
    });

  if (actionError) {
    console.error(
      "[Approved AI action insert error]",
      actionError,
    );
  }

  const {
    error: alertError,
  } = await supabase
    .from("alerts")
    .insert({
      incident_id:
        incidentId,

      audience:
        "citizen",

      title:
        "교통 불편 상황 안내",

      body:
        citizenGuidance,

      action_url:
        `/incidents/${incidentId}`,

      is_simulated:
        true,

      sent_at:
        now,
    });

  if (alertError) {
    console.error(
      "[Citizen alert insert error]",
      alertError,
    );
  }

  return NextResponse.json({
    success: true,
    message:
      "AI 분석을 승인했습니다. 시민 안내가 모의 등록되었습니다.",
    warnings: {
      actionSaveFailed:
        Boolean(actionError),
      alertSaveFailed:
        Boolean(alertError),
    },
  });
}

async function rejectAnalysis({
  incidentId,
  userId,
  aiSummary,
  adminRecommendation,
}: {
  incidentId: number;
  userId: string;
  aiSummary: string;
  adminRecommendation: string;
}) {
  const supabase =
    await createClient();

  const now =
    new Date().toISOString();

  const {
    error: updateError,
  } = await supabase
    .from("incidents")
    .update({
      status: "detected",
      requires_review: true,
    })
    .eq("id", incidentId);

  if (updateError) {
    console.error(
      "[Incident reject update error]",
      updateError,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          `반려 상태를 저장하지 못했습니다: ${updateError.message}`,
      },
      {
        status: 500,
      },
    );
  }

  const {
    error: actionError,
  } = await supabase
    .from("ai_actions")
    .insert({
      incident_id:
        incidentId,

      action_type:
        "report_generation",

      status:
        "rejected",

      title:
        "AI 교통 사건 분석 반려",

      content:
        aiSummary,

      payload: {
        adminRecommendation,
      },

      reviewed_by:
        userId,

      reviewed_at:
        now,
    });

  if (actionError) {
    console.error(
      "[Rejected AI action insert error]",
      actionError,
    );
  }

  return NextResponse.json({
    success: true,
    message:
      "AI 분석을 반려했습니다. 해당 사건을 다시 분석할 수 있습니다.",
    warnings: {
      actionSaveFailed:
        Boolean(actionError),
    },
  });
}
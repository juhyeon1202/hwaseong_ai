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

type ResolutionBody = {
  decision?:
    | "resolve"
    | "reopen";
  note?: string;
};

type IncidentRow = {
  id: number;

  status:
    | "detected"
    | "reviewing"
    | "notified"
    | "resolved";

  ai_summary:
    | string
    | null;

  evidence:
    | Record<string, unknown>
    | null;
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
            "관리자만 사건 상태를 변경할 수 있습니다.",
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

    let body: ResolutionBody;

    try {
      body =
        (await request.json()) as ResolutionBody;
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
        "resolve" &&
      body.decision !== "reopen"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "종결 또는 재개 결정이 필요합니다.",
        },
        {
          status: 400,
        },
      );
    }

    const note =
      body.note?.trim() ??
      "";

    if (
      body.decision ===
        "resolve" &&
      note.length < 2
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "사건 처리 메모를 2자 이상 작성해 주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      note.length > 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "처리 메모는 1,000자 이하로 작성해 주세요.",
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
      error: readError,
    } = await supabase
      .from("incidents")
      .select(
        `
          id,
          status,
          ai_summary,
          evidence
        `,
      )
      .eq("id", incidentId)
      .single();

    if (
      readError ||
      !data
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "교통 사건을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const incident =
      data as IncidentRow;

    if (
      body.decision ===
      "resolve"
    ) {
      return resolveIncident({
        incident,
        adminId:
          user.id,
        note,
      });
    }

    return reopenIncident({
      incident,
      adminId:
        user.id,
      note,
    });
  } catch (error) {
    console.error(
      "[Incident resolution error]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "사건 상태 변경 중 오류가 발생했습니다.";

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

async function resolveIncident({
  incident,
  adminId,
  note,
}: {
  incident: IncidentRow;
  adminId: string;
  note: string;
}) {
  if (
    incident.status ===
    "resolved"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "이미 해결 완료된 사건입니다.",
      },
      {
        status: 409,
      },
    );
  }

  const supabase =
    await createClient();

  const now =
    new Date().toISOString();

  const nextEvidence =
    appendResolutionHistory({
      evidence:
        incident.evidence,
      item: {
        action:
          "resolved",
        note,
        adminId,
        createdAt:
          now,
      },
    });

  const {
    error: updateError,
  } = await supabase
    .from("incidents")
    .update({
      status:
        "resolved",
      requires_review:
        false,
      evidence:
        nextEvidence,
    })
    .eq(
      "id",
      incident.id,
    );

  if (updateError) {
    throw new Error(
      `사건 종결 상태 저장 실패: ${updateError.message}`,
    );
  }

  // 해결된 사건의 대기 중인 똑버스 검토안은 자동 반려
  const {
    error: drtError,
  } = await supabase
    .from("ai_actions")
    .update({
      status:
        "rejected",
      reviewed_by:
        adminId,
      reviewed_at:
        now,
    })
    .eq(
      "incident_id",
      incident.id,
    )
    .eq(
      "action_type",
      "drt_recommendation",
    )
    .in("status", [
      "draft",
      "pending_review",
    ]);

  if (drtError) {
    console.error(
      "[Pending DRT reject error]",
      drtError,
    );
  }

  // 사건 종결 이력 저장
  const {
    error: historyError,
  } = await supabase
    .from("ai_actions")
    .insert({
      incident_id:
        incident.id,

      action_type:
        "report_generation",

      status:
        "completed",

      title:
        "교통 사건 해결 완료",

      content:
        note,

      payload: {
        previousStatus:
          incident.status,
        nextStatus:
          "resolved",
        isResolutionRecord:
          true,
      },

      reviewed_by:
        adminId,

      reviewed_at:
        now,

      executed_at:
        now,
    });

  if (historyError) {
    console.error(
      "[Resolution history insert error]",
      historyError,
    );
  }

  return NextResponse.json({
    success: true,
    message:
      "교통 사건을 해결 완료 상태로 변경했습니다.",
    incident: {
      id: incident.id,
      status:
        "resolved",
      requiresReview:
        false,
      evidence:
        nextEvidence,
    },
    warnings: {
      drtUpdateFailed:
        Boolean(drtError),
      historySaveFailed:
        Boolean(
          historyError,
        ),
    },
  });
}

async function reopenIncident({
  incident,
  adminId,
  note,
}: {
  incident: IncidentRow;
  adminId: string;
  note: string;
}) {
  if (
    incident.status !==
    "resolved"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "해결 완료된 사건만 다시 열 수 있습니다.",
      },
      {
        status: 409,
      },
    );
  }

  const supabase =
    await createClient();

  const now =
    new Date().toISOString();

  const nextStatus =
    incident.ai_summary
      ? "reviewing"
      : "detected";

  const nextEvidence =
    appendResolutionHistory({
      evidence:
        incident.evidence,
      item: {
        action:
          "reopened",
        note:
          note ||
          "관리자가 사건을 다시 열었습니다.",
        adminId,
        createdAt:
          now,
      },
    });

  const {
    error: updateError,
  } = await supabase
    .from("incidents")
    .update({
      status:
        nextStatus,

      requires_review:
        true,

      evidence:
        nextEvidence,
    })
    .eq(
      "id",
      incident.id,
    );

  if (updateError) {
    throw new Error(
      `사건 재개 상태 저장 실패: ${updateError.message}`,
    );
  }

  const {
    error: historyError,
  } = await supabase
    .from("ai_actions")
    .insert({
      incident_id:
        incident.id,

      action_type:
        "report_generation",

      status:
        "completed",

      title:
        "교통 사건 재검토 시작",

      content:
        note ||
        "관리자가 사건을 다시 열었습니다.",

      payload: {
        previousStatus:
          "resolved",
        nextStatus,
        isReopenRecord:
          true,
      },

      reviewed_by:
        adminId,

      reviewed_at:
        now,

      executed_at:
        now,
    });

  if (historyError) {
    console.error(
      "[Reopen history insert error]",
      historyError,
    );
  }

  return NextResponse.json({
    success: true,
    message:
      "교통 사건을 다시 검토할 수 있도록 열었습니다.",
    incident: {
      id: incident.id,
      status:
        nextStatus,
      requiresReview:
        true,
      evidence:
        nextEvidence,
    },
    warnings: {
      historySaveFailed:
        Boolean(
          historyError,
        ),
    },
  });
}

function appendResolutionHistory({
  evidence,
  item,
}: {
  evidence:
    | Record<string, unknown>
    | null;

  item: {
    action:
      | "resolved"
      | "reopened";
    note: string;
    adminId: string;
    createdAt: string;
  };
}) {
  const currentEvidence =
    evidence ?? {};

  const currentHistory =
    Array.isArray(
      currentEvidence.resolutionHistory,
    )
      ? currentEvidence.resolutionHistory
      : [];

  return {
    ...currentEvidence,

    resolutionHistory: [
      ...currentHistory,
      item,
    ],

    latestResolution:
      item,
  };
}
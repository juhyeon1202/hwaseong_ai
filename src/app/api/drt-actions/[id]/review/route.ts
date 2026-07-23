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
            "관리자만 똑버스 검토안을 처리할 수 있습니다.",
        },
        {
          status: 403,
        },
      );
    }

    const { id } =
      await context.params;

    const actionId =
      Number(id);

    if (
      !Number.isInteger(
        actionId,
      ) ||
      actionId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "올바르지 않은 검토안 번호입니다.",
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
      data: action,
      error: actionError,
    } = await supabase
      .from("ai_actions")
      .select(
        `
          id,
          incident_id,
          action_type,
          status,
          title,
          content,
          payload
        `,
      )
      .eq("id", actionId)
      .eq(
        "action_type",
        "drt_recommendation",
      )
      .single();

    if (
      actionError ||
      !action
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "똑버스 검토안을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      ![
        "draft",
        "pending_review",
      ].includes(
        action.status,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "이미 처리된 똑버스 검토안입니다.",
        },
        {
          status: 409,
        },
      );
    }

    const now =
      new Date().toISOString();

    if (
      body.decision ===
      "approve"
    ) {
      const currentPayload =
        isRecord(
          action.payload,
        )
          ? action.payload
          : {};

      const {
        data: updatedAction,
        error: updateError,
      } = await supabase
        .from("ai_actions")
        .update({
          // 프로토타입이므로 실제 호출 대신 모의 처리
          status:
            "simulated",

          reviewed_by:
            user.id,

          reviewed_at:
            now,

          executed_at:
            now,

          payload: {
            ...currentPayload,
            actualDispatch:
              false,
            simulatedDispatch:
              true,
            approvedAt:
              now,
            approvedBy:
              user.id,
          },
        })
        .eq("id", actionId)
        .select(
          `
            id,
            status,
            title,
            content,
            payload,
            reviewed_at,
            executed_at
          `,
        )
        .single();

      if (
        updateError ||
        !updatedAction
      ) {
        throw new Error(
          `똑버스 검토안 승인 실패: ${updateError?.message ?? "결과 없음"}`,
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "똑버스 모의 호출을 승인했습니다.",
        action:
          updatedAction,
      });
    }

    const {
      data: updatedAction,
      error: rejectError,
    } = await supabase
      .from("ai_actions")
      .update({
        status:
          "rejected",

        reviewed_by:
          user.id,

        reviewed_at:
          now,

        payload: {
          ...(
            isRecord(
              action.payload,
            )
              ? action.payload
              : {}
          ),

          actualDispatch:
            false,

          rejectedAt:
            now,

          rejectedBy:
            user.id,
        },
      })
      .eq("id", actionId)
      .select(
        `
          id,
          status,
          title,
          content,
          payload,
          reviewed_at
        `,
      )
      .single();

    if (
      rejectError ||
      !updatedAction
    ) {
      throw new Error(
        `똑버스 검토안 반려 실패: ${rejectError?.message ?? "결과 없음"}`,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "똑버스 호출 검토안을 반려했습니다.",
      action:
        updatedAction,
    });
  } catch (error) {
    console.error(
      "[DRT action review error]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "똑버스 검토 처리 중 오류가 발생했습니다.";

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

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
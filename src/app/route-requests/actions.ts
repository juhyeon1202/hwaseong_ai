"use server";

import {
  revalidatePath,
} from "next/cache";
import { redirect } from "next/navigation";

import {
  requireAdmin,
  requireUser,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type RouteRequestActionState = {
  status:
    | "idle"
    | "success"
    | "error";
  message: string;
};

type ParsedRouteRequest =
  | {
      success: true;
      title: string;
      description: string;
      stopIds: number[];
    }
  | {
      success: false;
      state: RouteRequestActionState;
    };

export async function createRouteRequest(
  _previousState: RouteRequestActionState,
  formData: FormData,
): Promise<RouteRequestActionState> {
  await requireUser();

  const parsed =
    parseRouteRequest(formData);

  if (!parsed.success) {
    return parsed.state;
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "create_route_request",
    {
      p_title: parsed.title,
      p_description:
        parsed.description,
      p_stop_ids: parsed.stopIds,
    },
  );

  if (error) {
    return errorState(
      error.message ||
        "희망 노선을 등록하지 못했습니다.",
    );
  }

  revalidatePath("/route-requests");

  return successState(
    "희망 노선이 등록되었습니다.",
  );
}

export async function updateRouteRequest(
  _previousState: RouteRequestActionState,
  formData: FormData,
): Promise<RouteRequestActionState> {
  await requireUser();

  const routeRequestId =
    formData
      .get("routeRequestId")
      ?.toString();

  if (!routeRequestId) {
    return errorState(
      "수정할 희망 노선 정보가 없습니다.",
    );
  }

  const parsed =
    parseRouteRequest(formData);

  if (!parsed.success) {
    return parsed.state;
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "update_route_request",
    {
      p_route_request_id:
        routeRequestId,
      p_title: parsed.title,
      p_description:
        parsed.description,
      p_stop_ids: parsed.stopIds,
    },
  );

  if (error) {
    return errorState(
      error.message ||
        "희망 노선을 수정하지 못했습니다.",
    );
  }

  revalidatePath("/route-requests");
  revalidatePath(
    `/route-requests/${routeRequestId}`,
  );

  return successState(
    "희망 노선이 수정되었습니다.",
  );
}

export async function deleteRouteRequest(
  formData: FormData,
) {
  const user = await requireUser();

  const routeRequestId =
    formData
      .get("routeRequestId")
      ?.toString();

  if (!routeRequestId) {
    throw new Error(
      "삭제할 희망 노선 정보가 없습니다.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("route_requests")
    .delete()
    .eq("id", routeRequestId)
    .eq("author_id", user.id);

  if (error) {
    throw new Error(
      "희망 노선을 삭제하지 못했습니다.",
    );
  }

  revalidatePath("/route-requests");
  redirect("/route-requests");
}

export async function toggleRouteVote(
  formData: FormData,
) {
  const user = await requireUser();

  const routeRequestId =
    formData
      .get("routeRequestId")
      ?.toString();

  if (!routeRequestId) {
    throw new Error(
      "투표할 희망 노선 정보가 없습니다.",
    );
  }

  const supabase = await createClient();

  const { data: existingVote } =
    await supabase
      .from("route_request_votes")
      .select("route_request_id")
      .eq(
        "route_request_id",
        routeRequestId,
      )
      .eq("user_id", user.id)
      .maybeSingle();

  if (existingVote) {
    const { error } = await supabase
      .from("route_request_votes")
      .delete()
      .eq(
        "route_request_id",
        routeRequestId,
      )
      .eq("user_id", user.id);

    if (error) {
      throw new Error(
        "투표를 취소하지 못했습니다.",
      );
    }
  } else {
    const { error } = await supabase
      .from("route_request_votes")
      .insert({
        route_request_id:
          routeRequestId,
        user_id: user.id,
      });

    if (error) {
      throw new Error(
        "투표를 처리하지 못했습니다.",
      );
    }
  }

  revalidatePath("/route-requests");
  revalidatePath(
    `/route-requests/${routeRequestId}`,
  );
}

export async function updateRouteRequestStatus(
  formData: FormData,
) {
  await requireAdmin();

  const routeRequestId =
    formData
      .get("routeRequestId")
      ?.toString();

  const status =
    formData.get("status")?.toString();

  const allowedStatuses = [
    "open",
    "reviewing",
    "adopted",
    "rejected",
    "closed",
  ];

  if (
    !routeRequestId ||
    !status ||
    !allowedStatuses.includes(status)
  ) {
    throw new Error(
      "올바른 상태 정보가 필요합니다.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("route_requests")
    .update({
      status,
    })
    .eq("id", routeRequestId);

  if (error) {
    throw new Error(
      "희망 노선 상태를 변경하지 못했습니다.",
    );
  }

  revalidatePath("/route-requests");
  revalidatePath(
    `/route-requests/${routeRequestId}`,
  );
}

function parseRouteRequest(
  formData: FormData,
): ParsedRouteRequest {
  const title =
    formData
      .get("title")
      ?.toString()
      .trim() ?? "";

  const description =
    formData
      .get("description")
      ?.toString()
      .trim() ?? "";

  const stopIds = formData
    .getAll("stopIds")
    .map((value) => Number(value))
    .filter(
      (value) =>
        Number.isInteger(value) &&
        value > 0,
    );

  if (
    title.length < 2 ||
    title.length > 100
  ) {
    return {
      success: false,
      state: errorState(
        "제목은 2자 이상 100자 이하로 입력해 주세요.",
      ),
    };
  }

  if (
    description.length < 5 ||
    description.length > 3000
  ) {
    return {
      success: false,
      state: errorState(
        "노선 설명은 5자 이상 입력해 주세요.",
      ),
    };
  }

  if (stopIds.length < 5) {
    return {
      success: false,
      state: errorState(
        "정류장을 이동 순서대로 최소 5개 선택해 주세요.",
      ),
    };
  }

  if (
    new Set(stopIds).size !==
    stopIds.length
  ) {
    return {
      success: false,
      state: errorState(
        "같은 정류장을 중복해서 선택할 수 없습니다.",
      ),
    };
  }

  return {
    success: true,
    title,
    description,
    stopIds,
  };
}

function successState(
  message: string,
): RouteRequestActionState {
  return {
    status: "success",
    message,
  };
}

function errorState(
  message: string,
): RouteRequestActionState {
  return {
    status: "error",
    message,
  };
}
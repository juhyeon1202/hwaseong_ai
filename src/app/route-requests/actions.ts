"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type RouteRequestActionState = {
  status:
    | "idle"
    | "success"
    | "error";
  message: string;
};

export async function createRouteRequest(
  _previousState: RouteRequestActionState,
  formData: FormData,
): Promise<RouteRequestActionState> {
  await requireUser();

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
      status: "error",
      message:
        "제목은 2자 이상 100자 이하로 입력해 주세요.",
    };
  }

  if (
    description.length < 5 ||
    description.length > 3000
  ) {
    return {
      status: "error",
      message:
        "노선 설명은 5자 이상 입력해 주세요.",
    };
  }

  if (stopIds.length < 5) {
    return {
      status: "error",
      message:
        "정류장을 이동 순서대로 최소 5개 선택해 주세요.",
    };
  }

  if (
    new Set(stopIds).size !==
    stopIds.length
  ) {
    return {
      status: "error",
      message:
        "같은 정류장을 중복해서 선택할 수 없습니다.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "create_route_request",
    {
      p_title: title,
      p_description: description,
      p_stop_ids: stopIds,
    },
  );

  if (error) {
    return {
      status: "error",
      message:
        error.message ||
        "희망 노선을 등록하지 못했습니다.",
    };
  }

  revalidatePath("/route-requests");

  return {
    status: "success",
    message:
      "희망 노선이 등록되었습니다.",
  };
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
}
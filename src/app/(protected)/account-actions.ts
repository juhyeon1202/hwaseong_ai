"use server";

import { revalidatePath } from "next/cache";

import {
  requireAdmin,
  requireUser,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AccountActionState = {
  status:
    | "idle"
    | "success"
    | "error";
  message: string;
};

export async function createFavorite(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const favoriteType =
    formData
      .get("favoriteType")
      ?.toString();

  const customLabel =
    formData
      .get("label")
      ?.toString()
      .trim() ?? "";

  let label = customLabel;
  let stopId: number | null = null;
  let routeId: number | null = null;
  let placePayload: Record<
    string,
    string
  > = {};

  if (favoriteType === "place") {
    const address =
      formData
        .get("address")
        ?.toString()
        .trim() ?? "";

    if (label.length < 1) {
      return errorState(
        "장소 이름을 입력해 주세요.",
      );
    }

    placePayload = {
      address,
    };
  } else if (
    favoriteType === "stop"
  ) {
    stopId = Number(
      formData
        .get("stopId")
        ?.toString(),
    );

    if (
      !Number.isInteger(stopId) ||
      stopId < 1
    ) {
      return errorState(
        "정류장을 선택해 주세요.",
      );
    }

    const { data: stop } =
      await supabase
        .from("transit_stops")
        .select("name")
        .eq("id", stopId)
        .single();

    if (!stop) {
      return errorState(
        "정류장 정보를 찾을 수 없습니다.",
      );
    }

    label = stop.name;
  } else if (
    favoriteType === "route"
  ) {
    routeId = Number(
      formData
        .get("routeId")
        ?.toString(),
    );

    if (
      !Number.isInteger(routeId) ||
      routeId < 1
    ) {
      return errorState(
        "버스 노선을 선택해 주세요.",
      );
    }

    const { data: route } =
      await supabase
        .from("bus_routes")
        .select("route_number")
        .eq("id", routeId)
        .single();

    if (!route) {
      return errorState(
        "버스 노선 정보를 찾을 수 없습니다.",
      );
    }

    label = `${route.route_number}번`;
  } else {
    return errorState(
      "즐겨찾기 유형을 선택해 주세요.",
    );
  }

  const { error } = await supabase
    .from("favorites")
    .insert({
      user_id: user.id,
      favorite_type:
        favoriteType,
      label,
      stop_id: stopId,
      route_id: routeId,
      place_payload:
        placePayload,
    });

  if (error) {
    return errorState(
      "즐겨찾기를 저장하지 못했습니다.",
    );
  }

  revalidatePath("/favorites");

  return successState(
    "즐겨찾기에 추가되었습니다.",
  );
}

export async function deleteFavorite(
  formData: FormData,
) {
  const user = await requireUser();

  const favoriteId =
    formData
      .get("favoriteId")
      ?.toString();

  if (!favoriteId) {
    throw new Error(
      "삭제할 즐겨찾기 정보가 없습니다.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("id", favoriteId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(
      "즐겨찾기를 삭제하지 못했습니다.",
    );
  }

  revalidatePath("/favorites");
}

export async function createInquiry(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();

  const title =
    formData
      .get("title")
      ?.toString()
      .trim() ?? "";

  const content =
    formData
      .get("content")
      ?.toString()
      .trim() ?? "";

  if (
    title.length < 2 ||
    title.length > 100
  ) {
    return errorState(
      "문의 제목은 2자 이상 100자 이하로 입력해 주세요.",
    );
  }

  if (
    content.length < 5 ||
    content.length > 3000
  ) {
    return errorState(
      "문의 내용은 5자 이상 3000자 이하로 입력해 주세요.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("inquiries")
    .insert({
      user_id: user.id,
      title,
      content,
    });

  if (error) {
    return errorState(
      "문의를 등록하지 못했습니다.",
    );
  }

  revalidatePath("/inquiries");

  return successState(
    "1:1 문의가 등록되었습니다.",
  );
}

export async function respondToInquiry(
  formData: FormData,
) {
  const admin = await requireAdmin();

  const inquiryId =
    formData
      .get("inquiryId")
      ?.toString();

  const status =
    formData.get("status")?.toString();

  const response =
    formData
      .get("response")
      ?.toString()
      .trim() ?? "";

  const validStatuses = [
    "waiting",
    "in_progress",
    "completed",
  ];

  if (
    !inquiryId ||
    !status ||
    !validStatuses.includes(status)
  ) {
    throw new Error(
      "올바른 문의 상태가 필요합니다.",
    );
  }

  if (
    status === "completed" &&
    response.length < 1
  ) {
    throw new Error(
      "답변 완료 시 답변 내용을 입력해야 합니다.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("inquiries")
    .update({
      status,
      admin_response:
        response || null,
      responded_by:
        response ? admin.id : null,
      responded_at:
        response
          ? new Date().toISOString()
          : null,
    })
    .eq("id", inquiryId);

  if (error) {
    throw new Error(
      "문의 답변을 저장하지 못했습니다.",
    );
  }

  revalidatePath("/inquiries");
}

function successState(
  message: string,
): AccountActionState {
  return {
    status: "success",
    message,
  };
}

function errorState(
  message: string,
): AccountActionState {
  return {
    status: "error",
    message,
  };
}
"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdmin,
  requireUser,
} from "@/lib/auth";

import { createClient } from "@/lib/supabase/server";

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

  const supabase =
    await createClient();

  const { data: existingVote } =
    await supabase
      .from(
        "route_request_votes",
      )
      .select(
        "route_request_id",
      )
      .eq(
        "route_request_id",
        routeRequestId,
      )
      .eq("user_id", user.id)
      .maybeSingle();

  if (existingVote) {
    const { error } =
      await supabase
        .from(
          "route_request_votes",
        )
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
    const { error } =
      await supabase
        .from(
          "route_request_votes",
        )
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

  revalidatePath(
    "/route-requests",
  );

  revalidatePath(
    `/route-requests/${routeRequestId}`,
  );

  revalidatePath(
    "/admin/route-requests",
  );

  revalidatePath("/admin");

  revalidatePath("/community");
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
    formData
      .get("status")
      ?.toString();

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
    !allowedStatuses.includes(
      status,
    )
  ) {
    throw new Error(
      "올바른 상태 정보가 필요합니다.",
    );
  }

  const supabase =
    await createClient();

  const { data: routeRequest } =
    await supabase
      .from("route_requests")
      .select("id, status")
      .eq("id", routeRequestId)
      .maybeSingle();

  if (!routeRequest) {
    throw new Error(
      "상태를 변경할 희망 노선을 찾지 못했습니다.",
    );
  }

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

  revalidatePath(
    "/route-requests",
  );

  revalidatePath(
    `/route-requests/${routeRequestId}`,
  );

  revalidatePath(
    "/admin/route-requests",
  );

  revalidatePath("/admin");
}

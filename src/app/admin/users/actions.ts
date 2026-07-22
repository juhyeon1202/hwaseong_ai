"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdmin,
  type AppRole,
} from "@/lib/auth";

import { createClient } from "@/lib/supabase/server";

export async function updateUserRole(
  formData: FormData,
) {
  const currentAdmin =
    await requireAdmin();

  const targetUserId =
    formData
      .get("userId")
      ?.toString()
      .trim();

  const requestedRole =
    formData
      .get("role")
      ?.toString()
      .trim();

  if (!targetUserId) {
    throw new Error(
      "권한을 변경할 회원 정보가 없습니다.",
    );
  }

  if (
    requestedRole !== "citizen" &&
    requestedRole !== "admin"
  ) {
    throw new Error(
      "올바른 회원 권한이 필요합니다.",
    );
  }

  if (
    targetUserId ===
    currentAdmin.id
  ) {
    throw new Error(
      "현재 로그인한 관리자 자신의 권한은 변경할 수 없습니다.",
    );
  }

  const supabase =
    await createClient();

  const {
    data: targetProfile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", targetUserId)
    .maybeSingle();

  if (
    profileError ||
    !targetProfile
  ) {
    throw new Error(
      "권한을 변경할 회원을 찾지 못했습니다.",
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role:
        requestedRole as AppRole,
    })
    .eq("id", targetUserId);

  if (error) {
    throw new Error(
      "회원 권한을 변경하지 못했습니다.",
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}
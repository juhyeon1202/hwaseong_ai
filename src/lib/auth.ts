import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AppRole = "citizen" | "admin";

export type CurrentUser = {
  id: string;
  email: string | null;
  username: string;
  nickname: string;
  role: AppRole;
  points: number;
};

export const getCurrentUser = cache(
  async (): Promise<CurrentUser | null> => {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("username, nickname, role, points")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      throw new Error(
        "사용자 프로필을 불러오지 못했습니다.",
      );
    }

    return {
      id: user.id,
      email: user.email ?? null,
      username:
        profile.username ??
        String(user.user_metadata?.username ?? ""),
      nickname: profile.nickname,
      role: profile.role as AppRole,
      points: profile.points,
    };
  },
);

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth?mode=login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/?error=forbidden");
  }

  return user;
}

export async function signOut() {
  "use server";

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw new Error(
      "로그아웃 처리에 실패했습니다.",
    );
  }

  redirect("/");
}

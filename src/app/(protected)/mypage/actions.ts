"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AttendanceActionState = {
  status:
    | "idle"
    | "success"
    | "error";
  message: string;
  earnedPoints?: number;
  streak?: number;
};

type AttendanceResult = {
  attendanceDate: string;
  streak: number;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
};

export async function checkAttendance(
  _previousState: AttendanceActionState,
  _formData: FormData,
): Promise<AttendanceActionState> {
  await requireUser();

  const supabase = await createClient();

  const { data, error } =
    await supabase.rpc(
      "check_attendance",
    );

  if (error) {
    const alreadyChecked =
      error.message.includes(
        "이미 출석",
      );

    return {
      status: "error",
      message: alreadyChecked
        ? "오늘은 이미 출석했습니다."
        : "출석 처리에 실패했습니다.",
    };
  }

  const result =
    data as AttendanceResult;

  revalidatePath("/");
  revalidatePath("/mypage");

  return {
    status: "success",
    message:
      result.bonusPoints > 0
        ? `연속 출석 보너스를 포함해 ${result.totalPoints}P를 받았습니다.`
        : `출석 완료! ${result.totalPoints}P를 받았습니다.`,
    earnedPoints:
      result.totalPoints,
    streak: result.streak,
  };
}
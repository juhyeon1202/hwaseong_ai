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
  void _previousState;
  void _formData;

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

export type ProfileActionState = {
  status:
    | "idle"
    | "success"
    | "error";
  message: string;
};

const validHomeDistricts = [
  "봉담읍",
  "우정읍",
  "향남읍",
  "남양읍",
  "매송면",
  "비봉면",
  "마도면",
  "송산면",
  "서신면",
  "팔탄면",
  "장안면",
  "양감면",
  "정남면",
  "새솔동",
  "진안동",
  "병점1동",
  "병점2동",
  "반월동",
  "기배동",
  "화산동",
  "동탄1동",
  "동탄2동",
  "동탄3동",
  "동탄4동",
  "동탄5동",
  "동탄6동",
  "동탄7동",
  "동탄8동",
  "동탄9동",
];

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser();

  const nickname =
    formData
      .get("nickname")
      ?.toString()
      .trim() ?? "";

  const homeDistrict =
    formData
      .get("homeDistrict")
      ?.toString()
      .trim() ?? "";

  if (
    nickname.length < 2 ||
    nickname.length > 30
  ) {
    return {
      status: "error",
      message:
        "닉네임은 2자 이상 30자 이하로 입력해 주세요.",
    };
  }

  if (
    !validHomeDistricts.includes(
      homeDistrict,
    )
  ) {
    return {
      status: "error",
      message:
        "올바른 거주지역을 선택해 주세요.",
    };
  }

  const supabase =
    await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      nickname,
      home_district:
        homeDistrict,
    })
    .eq("id", user.id);

  if (error) {
    const duplicateNickname =
      error.code === "23505";

    return {
      status: "error",
      message: duplicateNickname
        ? "이미 사용 중인 닉네임입니다."
        : "회원정보를 수정하지 못했습니다.",
    };
  }

  revalidatePath("/");
  revalidatePath("/mypage");
  revalidatePath("/ranking");

  return {
    status: "success",
    message:
      "회원정보가 수정되었습니다.",
  };
}
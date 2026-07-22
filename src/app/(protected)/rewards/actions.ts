"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type RewardResult = {
  drawId: string;
  rewardId: number;
  rewardName: string;
  rewardDescription:
    | string
    | null;
  rewardType:
    | "points"
    | "coupon"
    | "ticket";
  rewardValue: number;
  rewardPoints: number;
  ticketCost: number;
  remainingPoints: number;
  isSimulated: boolean;
};

export type RewardActionState = {
  status:
    | "idle"
    | "success"
    | "error";
  message: string;
  result?: RewardResult;
};

export async function drawReward(
  _previousState: RewardActionState,
  _formData: FormData,
): Promise<RewardActionState> {
  void _previousState;
  void _formData;

  await requireUser();

  const supabase = await createClient();

  const { data, error } =
    await supabase.rpc(
      "draw_reward",
    );

  if (error) {
    const insufficientPoints =
      error.message.includes(
        "포인트가 부족",
      );

    return {
      status: "error",
      message: insufficientPoints
        ? "룰렛 참여에는 300P가 필요합니다."
        : error.message ||
          "룰렛 추첨에 실패했습니다.",
    };
  }

  const result =
    data as RewardResult;

  revalidatePath("/");
  revalidatePath("/mypage");
  revalidatePath("/rewards");

  return {
    status: "success",
    message: `${result.rewardName}에 당첨되었습니다!`,
    result,
  };
}
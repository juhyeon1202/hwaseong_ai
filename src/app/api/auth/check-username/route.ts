import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{4,20}$/;

export async function GET(request: NextRequest) {
  const username = (request.nextUrl.searchParams.get("username") ?? "")
    .trim()
    .toLowerCase();

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      {
        available: false,
        message: "아이디는 영문, 숫자, 밑줄을 사용해 4~20자로 입력해 주세요.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { available: false, message: "아이디 중복 여부를 확인하지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    available: !data,
    message: data ? "이미 사용 중인 아이디입니다." : "사용할 수 있는 아이디입니다.",
  });
}

import { NextRequest, NextResponse } from "next/server";

import { isHwaseongDistrict } from "@/lib/hwaseong-districts";
import { supabaseAdmin } from "@/lib/supabase/admin";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{4,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function internalEmail(username: string) {
  return `${username}@users.hwaseong.local`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const username = String(body.username ?? "").trim().toLowerCase();
    const contactEmail = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const nickname = String(body.nickname ?? "").trim();
    const name = String(body.name ?? "").trim();
    const birthDate = String(body.birthDate ?? "");
    const gender = String(body.gender ?? "");
    const homeDistrict = String(body.homeDistrict ?? "");
    const language = String(body.language ?? "ko");
    const referralCode = String(body.referralCode ?? "").trim().toUpperCase();

    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json(
        { error: "아이디는 영문, 숫자, 밑줄을 사용해 4~20자로 입력해 주세요." },
        { status: 400 },
      );
    }

    if (!EMAIL_PATTERN.test(contactEmail)) {
      return NextResponse.json({ error: "올바른 이메일 주소를 입력해 주세요." }, { status: 400 });
    }

    if (password.length < 8 || nickname.length < 2 || name.length < 2) {
      return NextResponse.json({ error: "회원가입 정보를 다시 확인해 주세요." }, { status: 400 });
    }

    if (!birthDate || !["male", "female"].includes(gender) || !isHwaseongDistrict(homeDistrict)) {
      return NextResponse.json({ error: "생년월일, 성별, 거주 지역을 확인해 주세요." }, { status: 400 });
    }

    const { data: existing, error: duplicateError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (duplicateError) {
      return NextResponse.json({ error: "아이디 중복 여부를 확인하지 못했습니다." }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
    }

    const authEmail = internalEmail(username);
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        nickname,
        name,
        username,
        birth_date: birthDate,
        gender,
        home_district: homeDistrict,
        preferred_language: language,
        referral_code: referralCode || null,
        signup_completed: true,
      },
    });

    if (createError || !created.user) {
      const message = createError?.message.includes("already")
        ? "이미 사용 중인 아이디입니다."
        : createError?.message ?? "회원 계정을 만들지 못했습니다.";

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ username })
      .eq("id", created.user.id);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);

      const duplicate = profileError.code === "23505";
      return NextResponse.json(
        { error: duplicate ? "이미 사용 중인 아이디입니다." : "회원 프로필을 저장하지 못했습니다." },
        { status: duplicate ? 409 : 500 },
      );
    }

    const { error: contactError } = await supabaseAdmin
      .from("account_recovery_contacts")
      .insert({ user_id: created.user.id, contact_email: contactEmail });

    if (contactError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: "비밀번호 찾기 정보를 저장하지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, authEmail });
  } catch {
    return NextResponse.json({ error: "회원가입 요청을 처리하지 못했습니다." }, { status: 500 });
  }
}

import { randomBytes } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{4,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createTemporaryPassword() {
  return `Hw!${randomBytes(6).toString("base64url")}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const username = String(body.username ?? "").trim().toLowerCase();
    const contactEmail = String(body.email ?? "").trim().toLowerCase();

    if (!USERNAME_PATTERN.test(username) || !EMAIL_PATTERN.test(contactEmail)) {
      return NextResponse.json({ error: "아이디와 이메일을 올바르게 입력해 주세요." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: "비밀번호 찾기 요청을 처리하지 못했습니다." }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "아이디와 가입 시 입력한 이메일이 일치하지 않습니다." }, { status: 404 });
    }

    const { data: contact, error: contactError } = await supabaseAdmin
      .from("account_recovery_contacts")
      .select("contact_email")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (
      contactError ||
      !contact ||
      String(contact.contact_email ?? "").toLowerCase() !== contactEmail
    ) {
      return NextResponse.json({ error: "아이디와 가입 시 입력한 이메일이 일치하지 않습니다." }, { status: 404 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

    if (authError || !authData.user) {
      return NextResponse.json({ error: "회원 정보를 확인하지 못했습니다." }, { status: 500 });
    }

    const temporaryPassword = createTemporaryPassword();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: temporaryPassword,
      user_metadata: {
        ...authData.user.user_metadata,
        temporary_password: true,
        temporary_password_expires_at: expiresAt,
      },
    });

    if (updateError) {
      return NextResponse.json({ error: "임시 비밀번호를 발급하지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, temporaryPassword, expiresAt });
  } catch {
    return NextResponse.json({ error: "비밀번호 찾기 요청을 처리하지 못했습니다." }, { status: 500 });
  }
}

"use client";

import {
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export type AuthMode =
  | "login"
  | "signup"
  | "recover"
  | "update";

type AuthFormProps = {
  mode: AuthMode;
};

const modeText = {
  login: {
    title: "로그인",
    description: "화성 교통일지에 로그인하세요.",
    submit: "로그인",
  },
  signup: {
    title: "회원가입",
    description: "교통일지 서비스를 시작하세요.",
    submit: "회원가입",
  },
  recover: {
    title: "비밀번호 찾기",
    description:
      "비밀번호 재설정 링크를 이메일로 보내드립니다.",
    submit: "재설정 링크 보내기",
  },
  update: {
    title: "새 비밀번호 설정",
    description:
      "앞으로 사용할 새 비밀번호를 입력하세요.",
    submit: "비밀번호 변경",
  },
} satisfies Record<
  AuthMode,
  {
    title: string;
    description: string;
    submit: string;
  }
>;

function getErrorMessage(message: string) {
  if (message.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }

  if (message.includes("User already registered")) {
    return "이미 가입된 이메일입니다.";
  }

  if (message.includes("Password should be")) {
    return "비밀번호는 8자 이상 입력해 주세요.";
  }

  if (message.includes("Email not confirmed")) {
    return "이메일 인증을 완료해 주세요.";
  }

  return message;
}

export function AuthForm({
  mode,
}: AuthFormProps) {
  const router = useRouter();
  const text = modeText[mode];

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] =
    useState("");

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const needsNickname = mode === "signup";
  const needsEmail = mode !== "update";
  const needsPassword =
    mode === "login" ||
    mode === "signup" ||
    mode === "update";

  const needsPasswordConfirm =
    mode === "signup" || mode === "update";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    if (
      needsPasswordConfirm &&
      password !== passwordConfirm
    ) {
      setIsError(true);
      setMessage("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    if (
      needsPassword &&
      password.length < 8
    ) {
      setIsError(true);
      setMessage("비밀번호는 8자 이상 입력해 주세요.");
      return;
    }

    if (
      needsNickname &&
      nickname.trim().length < 2
    ) {
      setIsError(true);
      setMessage("닉네임은 2자 이상 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const origin = window.location.origin;

      if (mode === "login") {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (error) {
          throw error;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "로그인 정보를 확인하지 못했습니다.",
          );
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
          throw new Error(
            "회원 프로필을 불러오지 못했습니다.",
          );
        }

        router.replace(
          profile.role === "admin"
            ? "/admin"
            : "/",
        );

        router.refresh();
        return;
      }

      if (mode === "signup") {
        const { data, error } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo:
                `${origin}/auth/callback?next=/`,
              data: {
                nickname: nickname.trim(),
              },
            },
          });

        if (error) {
          throw error;
        }

        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }

        setMessage(
          "인증 이메일을 보냈습니다. 이메일의 인증 링크를 눌러 주세요.",
        );
        return;
      }

      if (mode === "recover") {
        const { error } =
          await supabase.auth.resetPasswordForEmail(
            email.trim(),
            {
              redirectTo:
                `${origin}/auth/callback?next=/auth?mode=update`,
            },
          );

        if (error) {
          throw error;
        }

        setMessage(
          "비밀번호 재설정 링크를 이메일로 보냈습니다.",
        );
        return;
      }

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      setMessage("비밀번호가 변경되었습니다.");

      window.setTimeout(() => {
        router.replace("/auth?mode=login");
        router.refresh();
      }, 1000);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "인증 처리 중 오류가 발생했습니다.";

      setIsError(true);
      setMessage(getErrorMessage(message));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_6px_20px_rgba(0,20,60,0.06)] sm:p-8">
      <header className="mb-8">
        <p className="text-sm font-semibold text-[#ec7211]">
          화성 교통일지
        </p>

        <h1 className="mt-2 text-2xl font-bold text-[#191f28]">
          {text.title}
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#8b95a1]">
          {text.description}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {needsNickname && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#333d4b]">
              닉네임
            </span>

            <input
              value={nickname}
              onChange={(event) =>
                setNickname(event.target.value)
              }
              required
              minLength={2}
              maxLength={30}
              autoComplete="nickname"
              placeholder="사용할 닉네임"
              className="min-h-12 w-full rounded-xl border border-[#e5e8eb] px-4 text-[#191f28] outline-none focus:border-[#ec7211]"
            />
          </label>
        )}

        {needsEmail && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#333d4b]">
              이메일
            </span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              autoComplete="email"
              placeholder="name@example.com"
              className="min-h-12 w-full rounded-xl border border-[#e5e8eb] px-4 text-[#191f28] outline-none focus:border-[#ec7211]"
            />
          </label>
        )}

        {needsPassword && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#333d4b]">
              비밀번호
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              minLength={8}
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              placeholder="8자 이상 입력"
              className="min-h-12 w-full rounded-xl border border-[#e5e8eb] px-4 text-[#191f28] outline-none focus:border-[#ec7211]"
            />
          </label>
        )}

        {needsPasswordConfirm && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#333d4b]">
              비밀번호 확인
            </span>

            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) =>
                setPasswordConfirm(
                  event.target.value,
                )
              }
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="비밀번호 다시 입력"
              className="min-h-12 w-full rounded-xl border border-[#e5e8eb] px-4 text-[#191f28] outline-none focus:border-[#ec7211]"
            />
          </label>
        )}

        {message && (
          <p
            role={isError ? "alert" : "status"}
            className={`rounded-xl px-4 py-3 text-sm ${
              isError
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#ec7211] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "처리 중..."
            : text.submit}
        </button>
      </form>

      <footer className="mt-6 space-y-3 text-center text-sm">
        {mode === "login" && (
          <>
            <Link
              href="/auth?mode=recover"
              className="block text-[#8b95a1]"
            >
              비밀번호를 잊으셨나요?
            </Link>

            <p className="text-[#8b95a1]">
              아직 회원이 아니신가요?{" "}
              <Link
                href="/auth?mode=signup"
                className="font-semibold text-[#ec7211]"
              >
                회원가입
              </Link>
            </p>
          </>
        )}

        {mode === "signup" && (
          <p className="text-[#8b95a1]">
            이미 회원이신가요?{" "}
            <Link
              href="/auth?mode=login"
              className="font-semibold text-[#ec7211]"
            >
              로그인
            </Link>
          </p>
        )}

        {(mode === "recover" ||
          mode === "update") && (
          <Link
            href="/auth?mode=login"
            className="font-semibold text-[#ec7211]"
          >
            로그인으로 돌아가기
          </Link>
        )}
      </footer>
    </section>
  );
}
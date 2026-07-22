"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useState,
  type FormEvent,
} from "react";

import {
  HWASEONG_DISTRICTS,
  isHwaseongDistrict,
} from "@/lib/hwaseong-districts";

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
    description:
      "화성 교통일지에 로그인하세요.",
    submit: "로그인",
  },
  signup: {
    title: "회원가입",
    description:
      "거주지역을 등록하고 화성시 교통 개선에 참여하세요.",
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

export function AuthForm({
  mode,
}: AuthFormProps) {
  const router = useRouter();
  const text = modeText[mode];

  const [nickname, setNickname] =
    useState("");

  const [
    homeDistrict,
    setHomeDistrict,
  ] = useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    passwordConfirm,
    setPasswordConfirm,
  ] = useState("");

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const needsSignupProfile =
    mode === "signup";

  const needsEmail =
    mode !== "update";

  const needsPassword =
    mode === "login" ||
    mode === "signup" ||
    mode === "update";

  const needsPasswordConfirm =
    mode === "signup" ||
    mode === "update";

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
      showError(
        "비밀번호가 서로 일치하지 않습니다.",
      );
      return;
    }

    if (
      needsPassword &&
      password.length < 8
    ) {
      showError(
        "비밀번호는 8자 이상 입력해 주세요.",
      );
      return;
    }

    if (
      needsSignupProfile &&
      nickname.trim().length < 2
    ) {
      showError(
        "닉네임은 2자 이상 입력해 주세요.",
      );
      return;
    }

    if (
      needsSignupProfile &&
      !isHwaseongDistrict(homeDistrict)
    ) {
      showError(
        "거주지역을 선택해 주세요.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase =
        createClient();

      const origin =
        window.location.origin;

      if (mode === "login") {
        await login(supabase);
        return;
      }

      if (mode === "signup") {
        const { data, error } =
          await supabase.auth.signUp({
            email: email
              .trim()
              .toLowerCase(),
            password,
            options: {
              emailRedirectTo:
                `${origin}/auth/callback?next=/`,
              data: {
                nickname:
                  nickname.trim(),
                home_district:
                  homeDistrict,
                preferred_language:
                  "ko",
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
          "인증 이메일을 보냈습니다. 이메일의 인증 링크를 누르면 가입이 완료됩니다.",
        );
        return;
      }

      if (mode === "recover") {
        const { error } =
          await supabase.auth
            .resetPasswordForEmail(
              email
                .trim()
                .toLowerCase(),
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

      setMessage(
        "비밀번호가 변경되었습니다.",
      );

      window.setTimeout(() => {
        router.replace(
          "/auth?mode=login",
        );
        router.refresh();
      }, 1000);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "인증 처리 중 오류가 발생했습니다.";

      showError(
        getErrorMessage(
          errorMessage,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function login(
    supabase: ReturnType<
      typeof createClient
    >,
  ) {
    const { error } =
      await supabase.auth
        .signInWithPassword({
          email: email
            .trim()
            .toLowerCase(),
          password,
        });

    if (error) {
      throw error;
    }

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "로그인 정보를 확인하지 못했습니다.",
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile
    ) {
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
  }

  function showError(
    nextMessage: string,
  ) {
    setIsError(true);
    setMessage(nextMessage);
  }

  return (
    <section className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
      <header className="mb-8">
        <p className="text-sm font-semibold text-brand-text">
          화성 교통일지
        </p>

        <h1 className="mt-2 text-2xl font-bold text-main">
          {text.title}
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted">
          {text.description}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {needsSignupProfile && (
          <>
            <AuthField
              label="닉네임"
              description="서비스에서 표시할 이름입니다."
            >
              <input
                value={nickname}
                onChange={(event) =>
                  setNickname(
                    event.target.value,
                  )
                }
                required
                minLength={2}
                maxLength={30}
                autoComplete="nickname"
                placeholder="2~30자 닉네임"
                className={
                  inputClassName
                }
              />
            </AuthField>

            <AuthField
              label="거주지역"
              description="지역 참여율과 동네 순위에 사용됩니다."
            >
              <select
                value={homeDistrict}
                onChange={(event) =>
                  setHomeDistrict(
                    event.target.value,
                  )
                }
                required
                className={
                  inputClassName
                }
              >
                <option
                  value=""
                  disabled
                >
                  거주지역 선택
                </option>

                {HWASEONG_DISTRICTS.map(
                  (district) => (
                    <option
                      key={district}
                      value={district}
                    >
                      {district}
                    </option>
                  ),
                )}
              </select>
            </AuthField>
          </>
        )}

        {needsEmail && (
          <AuthField
            label="이메일"
            description={
              mode === "signup"
                ? "가입 인증 링크를 받을 실제 이메일을 입력해 주세요."
                : undefined
            }
          >
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              required
              autoComplete="email"
              placeholder="name@example.com"
              className={inputClassName}
            />
          </AuthField>
        )}

        {needsPassword && (
          <AuthField label="비밀번호">
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              required
              minLength={8}
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              placeholder="8자 이상 입력"
              className={inputClassName}
            />
          </AuthField>
        )}

        {needsPasswordConfirm && (
          <AuthField label="비밀번호 확인">
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
              className={inputClassName}
            />
          </AuthField>
        )}

        {message && (
          <p
            role={
              isError
                ? "alert"
                : "status"
            }
            className={[
              "rounded-control px-4 py-3 text-sm leading-6",
              isError
                ? "bg-danger-soft text-danger"
                : "bg-success-soft text-success",
            ].join(" ")}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-12 w-full items-center justify-center rounded-control bg-brand px-5 font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "처리 중..."
            : text.submit}
        </button>
      </form>

      <AuthFooter mode={mode} />
    </section>
  );
}

function AuthField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-main">
        {label}
      </span>

      {children}

      {description && (
        <span className="mt-1.5 block text-xs leading-5 text-muted">
          {description}
        </span>
      )}
    </label>
  );
}

function AuthFooter({
  mode,
}: {
  mode: AuthMode;
}) {
  return (
    <footer className="mt-6 space-y-3 text-center text-sm">
      {mode === "login" && (
        <>
          <Link
            href="/auth?mode=recover"
            className="block text-muted hover:text-main"
          >
            비밀번호를 잊으셨나요?
          </Link>

          <p className="text-muted">
            아직 회원이 아니신가요?{" "}
            <Link
              href="/auth?mode=signup"
              className="font-semibold text-brand-text"
            >
              회원가입
            </Link>
          </p>

          <div className="border-t border-line-light pt-4">
            <p className="text-xs leading-5 text-muted">
              관리자 계정도 같은 로그인
              화면을 사용합니다. 관리자
              로그인 시 대시보드로 자동
              이동합니다.
            </p>
          </div>
        </>
      )}

      {mode === "signup" && (
        <p className="text-muted">
          이미 회원이신가요?{" "}
          <Link
            href="/auth?mode=login"
            className="font-semibold text-brand-text"
          >
            로그인
          </Link>
        </p>
      )}

      {(mode === "recover" ||
        mode === "update") && (
        <Link
          href="/auth?mode=login"
          className="font-semibold text-brand-text"
        >
          로그인으로 돌아가기
        </Link>
      )}
    </footer>
  );
}

function getErrorMessage(
  message: string,
) {
  if (
    message.includes(
      "Invalid login credentials",
    )
  ) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }

  if (
    message.includes(
      "User already registered",
    )
  ) {
    return "이미 가입된 이메일입니다.";
  }

  if (
    message.includes(
      "Password should be",
    )
  ) {
    return "비밀번호는 8자 이상 입력해 주세요.";
  }

  if (
    message.includes(
      "Email not confirmed",
    )
  ) {
    return "이메일 인증을 완료해 주세요.";
  }

  if (
    message.includes(
      "rate limit",
    ) ||
    message.includes(
      "rate_limit",
    )
  ) {
    return "인증 이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return message;
}

const inputClassName = [
  "min-h-12 w-full rounded-control",
  "border border-line bg-surface",
  "px-4 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-brand",
].join(" ");
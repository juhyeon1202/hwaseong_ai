"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type AuthMode = "login" | "signup" | "recover" | "update";

type AuthFormProps = {
  mode: AuthMode;
};

function authEmailFromUsername(username: string) {
  return `${username.trim().toLowerCase()}@users.hwaseong.local`;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const t = useTranslations("Auth");
  const common = useTranslations("Common");
  const text = {
    login: { title: t("loginTitle"), description: t("loginDescription"), submit: common("login") },
    signup: { title: t("signupTitle"), description: t("signupDescription"), submit: common("signup") },
    recover: { title: t("recoverTitle"), description: t("recoverDescription"), submit: t("recoverSubmit") },
    update: { title: t("updateTitle"), description: t("updateDescription"), submit: t("updateSubmit") },
  }[mode];

  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    setPassword("");
    setPasswordConfirm("");
    setTemporaryPassword("");
    setCopyMessage("");
    setMessage("");
    setIsError(false);
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setTemporaryPassword("");

    if ((mode === "login" || mode === "update") && password.length < 8) {
      showError("비밀번호는 8자 이상 입력해 주세요.");
      return;
    }

    if (mode === "update" && password !== passwordConfirm) {
      showError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login();
        return;
      }

      if (mode === "recover") {
        await recoverPassword();
        return;
      }

      if (mode === "update") {
        await updatePassword();
      }
    } catch (error) {
      showError(
        getErrorMessage(
          error instanceof Error ? error.message : "인증 처리 중 오류가 발생했습니다.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function login() {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{4,20}$/.test(normalizedIdentifier)) {
      throw new Error("아이디는 영문, 숫자, 밑줄을 사용해 4~20자로 입력해 주세요.");
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmailFromUsername(normalizedIdentifier),
      password,
    });

    if (error) {
      throw error;
    }

    const user = data.user;
    if (!user) {
      throw new Error("로그인 정보를 확인하지 못했습니다.");
    }

    if (user.user_metadata?.temporary_password) {
      const expiresAt = Date.parse(
        String(user.user_metadata.temporary_password_expires_at ?? ""),
      );

      if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
        await supabase.auth.signOut();
        throw new Error("임시 비밀번호가 만료되었습니다. 비밀번호 찾기에서 다시 발급해 주세요.");
      }

      router.replace("/auth?mode=update");
      router.refresh();
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("회원 프로필을 불러오지 못했습니다.");
    }

    router.replace(profile.role === "admin" ? "/admin" : "/");
    router.refresh();
  }

  async function recoverPassword() {
    const username = identifier.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
      throw new Error("가입할 때 사용한 아이디를 입력해 주세요.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("가입할 때 입력한 이메일을 정확히 입력해 주세요.");
    }

    const response = await fetch("/api/auth/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email: normalizedEmail }),
    });
    const result = (await response.json()) as {
      temporaryPassword?: string;
      error?: string;
    };

    if (!response.ok || !result.temporaryPassword) {
      throw new Error(result.error ?? "임시 비밀번호를 발급하지 못했습니다.");
    }

    setTemporaryPassword(result.temporaryPassword);
    setMessage("임시 비밀번호가 발급되었습니다. 10분 이내에 로그인해 주세요.");
  }

  async function updatePassword() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const currentMetadata = userData.user?.user_metadata ?? {};

    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        ...currentMetadata,
        temporary_password: false,
        temporary_password_expires_at: null,
      },
    });

    if (error) {
      throw error;
    }

    setMessage("비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.");
    await supabase.auth.signOut();

    window.setTimeout(() => {
      router.replace("/auth?mode=login");
      router.refresh();
    }, 1200);
  }

  async function copyTemporaryPassword() {
    if (!temporaryPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopyMessage("임시 비밀번호를 복사했습니다.");
    } catch {
      setCopyMessage("복사하지 못했습니다. 임시 비밀번호를 직접 선택해 주세요.");
    }
  }

  function goToTemporaryLogin() {
    setPassword("");
    setPasswordConfirm("");
    setTemporaryPassword("");
    setCopyMessage("");
    setMessage("");
    setIsError(false);
    router.replace("/auth?mode=login");
    router.refresh();
  }

  function showError(nextMessage: string) {
    setIsError(true);
    setMessage(nextMessage);
  }

  return (
    <section className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
      <header className="mb-8">
        <p className="text-sm font-semibold text-brand-text">{common("serviceName")}</p>
        <h1 className="mt-2 text-2xl font-bold text-main">{text.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{text.description}</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {(mode === "login" || mode === "recover") && (
          <AuthField
            label={t("username")}
          >
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              placeholder={mode === "login" ? t("username") : t("signupUsername")}
              className={inputClassName}
            />
          </AuthField>
        )}

        {mode === "recover" && (
          <AuthField
            label={t("savedEmail")}
            description={t("savedEmailHelp")}
          >
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="example@email.com"
              className={inputClassName}
            />
          </AuthField>
        )}

        {(mode === "login" || mode === "update") && (
          <AuthField label={mode === "update" ? t("newPassword") : t("password")}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={t("passwordPlaceholder")}
              className={inputClassName}
            />
          </AuthField>
        )}

        {mode === "update" && (
          <AuthField label={t("newPasswordConfirm")}>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={t("newPasswordAgain")}
              className={inputClassName}
            />
          </AuthField>
        )}

        {mode === "recover" && temporaryPassword && (
          <section className="rounded-control border border-brand-line bg-brand-softer p-4 text-center">
            <p className="text-xs font-semibold text-brand-text">{t("temporaryPasswordTitle")}</p>
            <p className="mt-2 break-all font-mono text-xl font-extrabold tracking-wide text-main">
              {temporaryPassword}
            </p>
            <button
              type="button"
              onClick={() => void copyTemporaryPassword()}
              className="mt-3 min-h-10 rounded-control border border-brand-line bg-white px-4 text-sm font-bold text-brand-text hover:bg-brand-softer"
            >
              {t("copyTemporaryPassword")}
            </button>
            {copyMessage && (
              <p className="mt-2 text-xs leading-5 text-muted">{copyMessage}</p>
            )}
            <p className="mt-2 text-xs leading-5 text-muted">
              {t("temporaryPasswordHelp")}
            </p>
          </section>
        )}

        {message && (
          <p
            role={isError ? "alert" : "status"}
            className={[
              "rounded-control px-4 py-3 text-sm leading-6",
              isError ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
            ].join(" ")}
          >
            {message}
          </p>
        )}

        {!(mode === "recover" && temporaryPassword) && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-12 w-full items-center justify-center rounded-control bg-brand px-5 font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? t("processing") : text.submit}
          </button>
        )}

        {mode === "recover" && temporaryPassword && (
          <button
            type="button"
            onClick={goToTemporaryLogin}
            className="flex min-h-12 w-full items-center justify-center rounded-control bg-brand px-5 font-semibold text-on-brand"
          >
            {t("temporaryLogin")}
          </button>
        )}
      </form>

      <AuthFooter
        mode={mode}
        labels={{
          forgotPassword: t("forgotPassword"),
          notMember: t("notMember"),
          signup: common("signup"),
          backToLogin: t("backToLogin"),
        }}
      />
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
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-main">{label}</span>
      {children}
      {description && <span className="mt-1.5 block text-xs leading-5 text-muted">{description}</span>}
    </label>
  );
}

function AuthFooter({
  mode,
  labels,
}: {
  mode: AuthMode;
  labels: {
    forgotPassword: string;
    notMember: string;
    signup: string;
    backToLogin: string;
  };
}) {
  return (
    <footer className="mt-6 space-y-3 text-center text-sm">
      {mode === "login" && (
        <>
          <Link href="/auth?mode=recover" className="block text-muted hover:text-main">
            {labels.forgotPassword}
          </Link>
          <p className="text-muted">
            {labels.notMember}{" "}
            <Link href="/auth?mode=signup" className="font-semibold text-brand-text">
              {labels.signup}
            </Link>
          </p>
        </>
      )}

      {(mode === "recover" || mode === "update") && (
        <Link href="/auth?mode=login" className="font-semibold text-brand-text">
          {labels.backToLogin}
        </Link>
      )}
    </footer>
  );
}

function getErrorMessage(message: string) {
  if (message.includes("Invalid login credentials")) {
    return "아이디 또는 비밀번호가 올바르지 않습니다.";
  }
  if (message.includes("Email logins are disabled")) {
    return "Supabase에서 Email provider를 켜 주세요.";
  }
  if (message.includes("Password should be")) {
    return "비밀번호는 8자 이상 입력해 주세요.";
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

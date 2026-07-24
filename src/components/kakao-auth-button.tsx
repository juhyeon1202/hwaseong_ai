"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type KakaoAuthButtonProps = {
  next?: string;
  label?: string;
};

export function KakaoAuthButton({
  next = "/",
  label = "카카오로 시작하기",
}: KakaoAuthButtonProps) {
  const [isPending, setIsPending] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  async function handleKakaoLogin() {
    setIsPending(true);
    setErrorMessage("");

    try {
      const supabase =
        createClient();

      const callbackUrl =
        new URL(
          "/auth/callback",
          window.location.origin,
        );

      callbackUrl.searchParams.set(
        "next",
        next,
      );

      const { error } =
        await supabase.auth
          .signInWithOAuth({
            provider: "kakao",
            options: {
              redirectTo:
                callbackUrl.toString(),
            },
          });

      if (error) {
        throw error;
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "카카오 인증을 시작하지 못했습니다.",
      );

      setIsPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          void handleKakaoLogin()
        }
        disabled={isPending}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-control bg-[#FEE500] px-5 text-sm font-bold text-[#191919] transition hover:bg-[#f4dc00] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <KakaoIcon />

        {isPending
          ? "카카오 연결 중..."
          : label}
      </button>

      {errorMessage && (
        <p
          role="alert"
          className="mt-3 rounded-control bg-danger-soft p-3 text-sm text-danger"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="currentColor"
    >
      <path d="M12 3C6.477 3 2 6.477 2 10.765c0 2.744 1.835 5.153 4.596 6.536l-1.17 4.29c-.104.38.33.682.664.462l5.126-3.385c.258.018.52.027.784.027 5.523 0 10-3.477 10-7.93S17.523 3 12 3Z" />
    </svg>
  );
}
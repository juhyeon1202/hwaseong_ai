import { redirect } from "next/navigation";

import {
  AuthForm,
  type AuthMode,
} from "@/components/auth-form";
import { BackButton } from "@/components/back-button";
import { SignupForm } from "@/components/signup-form";
import { getCurrentUser } from "@/lib/auth";

type AuthPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

const allowedModes =
  new Set<AuthMode>([
    "login",
    "signup",
    "recover",
    "update",
  ]);

export default async function AuthPage({
  searchParams,
}: AuthPageProps) {
  const params = await searchParams;

  const requestedMode =
    (params.mode ??
      "login") as AuthMode;

  const mode = allowedModes.has(
    requestedMode,
  )
    ? requestedMode
    : "login";

  const user = await getCurrentUser();

  if (mode === "update") {
    if (!user) {
      redirect(
        "/auth?mode=login",
      );
    }
  } else if (user) {
    redirect(
      user.role === "admin"
        ? "/admin"
        : "/",
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <header className="border-b border-line-light bg-white">
        <div className="flex h-[72px] items-center px-4 sm:px-8 lg:px-10">
          <BackButton
            fallbackHref="/"
            label="홈으로 돌아가기"
            showLabel
            className="w-auto px-2"
          />
        </div>
      </header>

      <main className="flex items-start justify-center px-4 py-8 sm:px-6 sm:py-12">
        {mode === "signup" ? (
          <SignupForm />
        ) : (
          <AuthForm mode={mode} />
        )}
      </main>
    </div>
  );
}
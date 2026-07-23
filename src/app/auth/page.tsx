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
}
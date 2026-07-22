import {
  AuthForm,
  type AuthMode,
} from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

type AuthPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

const allowedModes = new Set<AuthMode>([
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
    (params.mode ?? "login") as AuthMode;

  const mode = allowedModes.has(requestedMode)
    ? requestedMode
    : "login";

  /*
   * 비밀번호 변경 화면은 로그인 세션이 필요합니다.
   * 나머지 인증 화면은 로그인 상태라면 홈으로 이동합니다.
   */
  const user = await getCurrentUser();

  if (mode === "update") {
    if (!user) {
      redirect("/auth?mode=login");
    }
  } else if (user) {
    redirect(
      user.role === "admin"
        ? "/admin"
        : "/",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f5f7] px-5 py-10">
      <AuthForm mode={mode} />
    </main>
  );
}
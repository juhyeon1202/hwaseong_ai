import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type ConfirmSignupPageProps = {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    error?: string;
  }>;
};

async function confirmSignup(
  formData: FormData,
) {
  "use server";

  const tokenHash = String(
    formData.get("token_hash") ?? "",
  );

  if (!tokenHash) {
    redirect(
      "/auth/confirm-signup?error=missing_token",
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

  if (error) {
    redirect(
      "/auth/confirm-signup?error=invalid_token",
    );
  }

  redirect("/");
}

export default async function ConfirmSignupPage({
  searchParams,
}: ConfirmSignupPageProps) {
  const params = await searchParams;

  const tokenHash =
    params.token_hash ?? "";

  /*
  * Supabase가 이메일 인증을 먼저 완료한 후
  * 이 페이지로 이동한 경우에는 token_hash가 없습니다.
  * 이때는 정상 인증으로 간주하고 로그인 페이지로 이동합니다.
  */
  if (
    !tokenHash &&
    !params.error
  ) {
    redirect(
      "/auth?mode=login&confirmed=1",
    );
  }

  const hasError =
    params.error === "invalid_token" ||
    params.error === "missing_token";

  return (
    <main className="flex min-h-[calc(100vh-var(--app-header-height))] items-center justify-center bg-[#f4f5f7] px-4 py-12">
      <section className="w-full max-w-md rounded-card border border-line bg-white p-6 text-center shadow-card sm:p-8">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-soft text-2xl text-brand-text">
          ✓
        </span>

        <h1 className="mt-6 text-2xl font-bold text-main">
          이메일 확인
        </h1>

        {hasError ? (
          <>
            <p className="mt-3 text-sm leading-6 text-danger">
              가입 확인 링크가 올바르지
              않거나 만료되었습니다.
            </p>

            <a
              href="/auth?mode=signup"
              className="mt-6 flex min-h-12 w-full items-center justify-center rounded-control bg-brand px-5 font-semibold text-white"
            >
              회원가입으로 돌아가기
            </a>
          </>
        ) : tokenHash ? (
          <>
            <p className="mt-3 text-sm leading-6 text-muted">
              아래 버튼을 누르면 이메일
              인증과 회원가입이 완료됩니다.
            </p>

            <form
              action={confirmSignup}
              className="mt-6"
            >
              <input
                type="hidden"
                name="token_hash"
                value={tokenHash}
              />

              <button
                type="submit"
                className="flex min-h-12 w-full items-center justify-center rounded-control bg-brand px-5 font-semibold text-white transition hover:bg-brand-hover"
              >
                회원가입 완료
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-danger">
              가입 확인 정보가 없습니다.
              이메일의 링크를 다시 확인해
              주세요.
            </p>

            <a
              href="/auth?mode=signup"
              className="mt-6 flex min-h-12 w-full items-center justify-center rounded-control border border-line bg-white px-5 font-semibold text-main"
            >
              회원가입으로 돌아가기
            </a>
          </>
        )}
      </section>
    </main>
  );
}
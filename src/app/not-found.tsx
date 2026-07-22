import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-12">
      <section className="w-full max-w-md rounded-card border border-line bg-surface p-6 text-center shadow-card sm:p-8">
        <p className="text-sm font-bold text-info">
          404
        </p>

        <h1 className="mt-3 text-2xl font-bold text-main">
          페이지를 찾을 수 없어요
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          주소가 잘못되었거나 이동한 페이지일 수
          있습니다.
        </p>

        <Link
          href="/"
          className="mt-7 flex min-h-12 items-center justify-center rounded-control bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hover"
        >
          홈으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
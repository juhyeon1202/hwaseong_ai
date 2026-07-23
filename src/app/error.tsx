"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-card border border-line bg-surface p-6 text-center shadow-card sm:p-8">
        <span className="mx-auto flex size-12 items-center justify-center rounded-pill bg-danger-soft text-xl font-bold text-danger">
          !
        </span>

        <h1 className="mt-5 text-xl font-bold text-main">
          화면을 불러오지 못했어요
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          잠시 후 다시 시도해 주세요. 문제가
          계속되면 처음 화면으로 이동해 주세요.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-12 rounded-control bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hover"
          >
            다시 시도
          </button>

          <Link
            href="/"
            className="flex min-h-12 items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold text-secondary"
          >
            홈으로
          </Link>
        </div>
      </section>
    </div>
  );
}
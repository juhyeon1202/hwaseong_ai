"use client";

import {
  useRef,
  useState,
} from "react";

import {
  toggleRouteVoteWithResult,
  type RouteVoteActionState,
} from "@/app/route-requests/actions";

type RouteVoteButtonProps = {
  routeRequestId: string;
  voted: boolean;
};

export function RouteVoteButton({
  routeRequestId,
  voted,
}: RouteVoteButtonProps) {
  const dialogRef =
    useRef<HTMLDialogElement>(null);

  const [isPending, setIsPending] =
    useState(false);

  const [result, setResult] =
    useState<RouteVoteActionState | null>(
      null,
    );

  async function handleVote() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    const formData = new FormData();
    formData.set(
      "routeRequestId",
      routeRequestId,
    );

    try {
      const nextResult =
        await toggleRouteVoteWithResult(
          formData,
        );

      setResult(nextResult);
      dialogRef.current?.showModal();
    } catch {
      setResult({
        status: "error",
        message:
          "투표 처리 중 오류가 발생했습니다.",
      });

      dialogRef.current?.showModal();
    } finally {
      setIsPending(false);
    }
  }

  function finish() {
    if (result?.status === "success") {
      window.location.reload();
      return;
    }

    dialogRef.current?.close();
  }

  const success =
    result?.status === "success";

  return (
    <>
      <button
        type="button"
        onClick={handleVote}
        disabled={isPending}
        className={[
          "inline-flex min-h-11 items-center justify-center rounded-control px-5 text-sm font-bold transition-colors",
          voted
            ? "border border-line bg-surface text-secondary hover:bg-surface-muted"
            : "bg-brand text-on-brand hover:bg-brand-hover",
          isPending
            ? "cursor-wait opacity-60"
            : "",
        ].join(" ")}
      >
        {isPending
          ? "처리 중..."
          : voted
            ? "투표 취소"
            : "이 노선에 투표"}
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-32px)] max-w-md rounded-card border border-line bg-surface p-0 text-main shadow-floating backdrop:bg-black/45"
      >
        <div className="p-6 text-center sm:p-8">
          <div
            className={[
              "mx-auto flex size-14 items-center justify-center rounded-full text-2xl font-bold",
              success
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger",
            ].join(" ")}
          >
            {success ? "✓" : "!"}
          </div>

          <h2 className="mt-5 text-xl font-bold text-main">
            {success
              ? result?.voted
                ? "투표 완료"
                : "투표 취소 완료"
              : "처리 실패"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-secondary">
            {result?.message}
          </p>

          <button
            type="button"
            onClick={finish}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand px-5 text-sm font-bold text-on-brand hover:bg-brand-hover"
          >
            확인
          </button>
        </div>
      </dialog>
    </>
  );
}
"use client";

import {
  useEffect,
} from "react";

type ActionResultModalProps = {
  open: boolean;
  title: string;
  message: string;
  status?: "success" | "error";
  onConfirm: () => void;
};

export function ActionResultModal({
  open,
  title,
  message,
  status = "success",
  onConfirm,
}: ActionResultModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onConfirm();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    open,
    onConfirm,
  ]);

  if (!open) {
    return null;
  }

  const isSuccess =
    status === "success";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-result-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
    >
      <section className="w-full max-w-md rounded-card border border-line bg-white p-7 text-center shadow-floating">
        <div
          className={[
            "mx-auto flex size-14 items-center justify-center rounded-full text-2xl font-bold",
            isSuccess
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger",
          ].join(" ")}
        >
          {isSuccess ? "✓" : "!"}
        </div>

        <h2
          id="action-result-title"
          className="mt-5 text-xl font-bold text-main"
        >
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-secondary">
          {message}
        </p>

        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand px-5 text-sm font-bold text-on-brand transition-colors hover:bg-brand-hover"
        >
          확인
        </button>
      </section>
    </div>
  );
}
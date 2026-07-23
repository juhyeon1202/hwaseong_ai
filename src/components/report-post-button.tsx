"use client";

import { useActionState } from "react";

import {
  reportPost,
  type ReportActionState,
} from "@/app/community/actions";
import { Button } from "@/components/ui";

const initialState: ReportActionState = {
  status: "idle",
  message: "",
};

const reasonOptions = [
  {
    value: "spam",
    label: "스팸",
  },
  {
    value: "abuse",
    label: "욕설/비방",
  },
  {
    value: "false_info",
    label: "허위정보",
  },
  {
    value: "other",
    label: "기타",
  },
] as const;

type ReportPostButtonProps = {
  postId: string;
  alreadyReported: boolean;
};

export function ReportPostButton({
  postId,
  alreadyReported,
}: ReportPostButtonProps) {
  const [state, formAction, isPending] =
    useActionState(
      reportPost,
      initialState,
    );

  const reported =
    alreadyReported ||
    state.status === "success";

  if (reported) {
    return (
      <div className="text-right">
        <span className="inline-flex min-h-9 items-center rounded-pill bg-surface-muted px-3 text-xs font-semibold text-muted">
          신고 접수됨
        </span>

        {state.status === "success" && (
          <p className="mt-1 text-xs text-success">
            {state.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <details className="relative">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-control px-2 text-xs font-semibold text-danger hover:bg-danger-soft [&::-webkit-details-marker]:hidden">
        신고
      </summary>

      <form
        action={formAction}
        className="absolute right-0 top-[calc(100%+4px)] z-20 w-72 space-y-3 rounded-card border border-line bg-surface p-4 shadow-floating"
      >
        <input
          type="hidden"
          name="postId"
          value={postId}
        />

        <p className="text-sm font-semibold text-main">
          신고 사유를 선택해 주세요
        </p>

        <div className="space-y-2">
          {reasonOptions.map((option) => (
            <label
              key={option.value}
              className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-secondary"
            >
              <input
                type="radio"
                name="reason"
                value={option.value}
                required
                className="size-4 accent-[var(--color-brand)]"
              />

              {option.label}
            </label>
          ))}
        </div>

        <textarea
          name="detail"
          rows={2}
          maxLength={500}
          placeholder="상세 사유(선택)"
          className="w-full resize-none rounded-control border border-line bg-surface px-3 py-2 text-sm text-main outline-none placeholder:text-muted focus:border-brand"
        />

        {state.message && (
          <p
            role="status"
            className="rounded-control bg-danger-soft p-2 text-xs text-danger"
          >
            {state.message}
          </p>
        )}

        <Button
          type="submit"
          variant="danger"
          fullWidth
          disabled={isPending}
        >
          {isPending
            ? "접수 중..."
            : "신고 제출"}
        </Button>
      </form>
    </details>
  );
}

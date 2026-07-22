"use client";

import {
  type FormEvent,
  useActionState,
  useEffect,
  useRef,
} from "react";

import {
  createComment,
  deleteComment,
  type CommentActionState,
} from "@/app/community/actions";
import {
  Button,
} from "@/components/ui";

const initialState: CommentActionState = {
  status: "idle",
  message: "",
};

export function CommentForm({
  postId,
}: {
  postId: string;
}) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] =
    useActionState(
      createComment,
      initialState,
    );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3"
    >
      <input
        type="hidden"
        name="postId"
        value={postId}
      />

      <textarea
        name="content"
        required
        minLength={1}
        maxLength={1000}
        rows={3}
        placeholder="댓글을 작성해 주세요."
        className="w-full resize-none rounded-control border border-line bg-surface px-3 py-3 text-sm text-main outline-none placeholder:text-muted focus:border-brand"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            name="isSecret"
            className="size-4 accent-[var(--color-brand)]"
          />

          비밀댓글
        </label>

        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "등록 중..."
            : "댓글 등록"}
        </Button>
      </div>

      {state.message && (
        <p
          role="status"
          className={[
            "rounded-control p-3 text-sm",
            state.status === "success"
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger",
          ].join(" ")}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function DeleteCommentButton({
  commentId,
  postId,
}: {
  commentId: string;
  postId: string;
}) {
  function confirmDelete(
    event: FormEvent<HTMLFormElement>,
  ) {
    const confirmed = window.confirm(
      "이 댓글을 삭제할까요?",
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={deleteComment}
      onSubmit={confirmDelete}
    >
      <input
        type="hidden"
        name="commentId"
        value={commentId}
      />

      <input
        type="hidden"
        name="postId"
        value={postId}
      />

      <button
        type="submit"
        className="inline-flex min-h-9 items-center text-xs font-semibold text-danger"
      >
        삭제
      </button>
    </form>
  );
}
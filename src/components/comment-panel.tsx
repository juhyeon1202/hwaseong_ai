"use client";

import {
  type FormEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createComment,
  deleteComment,
  updateComment,
  type CommentActionState,
} from "@/app/community/actions";
import { Button } from "@/components/ui";

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

  const dialogRef =
    useRef<HTMLDialogElement>(null);

  const [state, formAction, isPending] =
    useActionState(
      createComment,
      initialState,
    );

  useEffect(() => {
    if (!state.message) {
      return;
    }

    if (state.status === "success") {
      formRef.current?.reset();
    }

    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, [
    state.status,
    state.message,
  ]);

  function closeResult() {
    if (state.status === "success") {
      window.location.reload();
      return;
    }

    dialogRef.current?.close();
  }

  return (
    <>
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
      </form>

      <ResultDialog
        dialogRef={dialogRef}
        state={state}
        successTitle="등록 완료"
        onConfirm={closeResult}
      />
    </>
  );
}

type EditableCommentContentProps = {
  commentId: string;
  postId: string;
  content: string;
  canEdit: boolean;
  canDelete: boolean;
};

export function EditableCommentContent({
  commentId,
  postId,
  content,
  canEdit,
  canDelete,
}: EditableCommentContentProps) {
  const dialogRef =
    useRef<HTMLDialogElement>(null);

  const [isEditing, setIsEditing] =
    useState(false);

  const [isPending, setIsPending] =
    useState(false);

  const [dialogMode, setDialogMode] =
    useState<
      "delete-confirm" | "result"
    >("result");

  const [resultState, setResultState] =
    useState<CommentActionState>(
      initialState,
    );

  const [resultTitle, setResultTitle] =
    useState("");

  function beginEditing() {
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  function openDeleteConfirm() {
    setDialogMode("delete-confirm");
    setResultState(initialState);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function finishResult() {
    if (resultState.status === "success") {
      window.location.reload();
      return;
    }

    closeDialog();
  }

  function showResult(
    title: string,
    result: CommentActionState,
  ) {
    setResultTitle(title);
    setResultState(result);
    setDialogMode("result");

    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setIsPending(true);

    const formData = new FormData(
      event.currentTarget,
    );

    try {
      const result =
        await updateComment(formData);

      if (result.status === "success") {
        setIsEditing(false);
      }

      showResult(
        result.status === "success"
          ? "수정 완료"
          : "수정 실패",
        result,
      );
    } catch {
      showResult("수정 실패", {
        status: "error",
        message:
          "댓글 수정 중 오류가 발생했습니다.",
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    const formData = new FormData();
    formData.set("commentId", commentId);
    formData.set("postId", postId);

    try {
      const result =
        await deleteComment(formData);

      showResult(
        result.status === "success"
          ? "삭제 완료"
          : "삭제 실패",
        result,
      );
    } catch {
      showResult("삭제 실패", {
        status: "error",
        message:
          "댓글 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      {isEditing ? (
        <form
          onSubmit={handleUpdate}
          className="mt-3"
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

          <textarea
            name="content"
            required
            minLength={1}
            maxLength={1000}
            rows={4}
            defaultValue={content}
            autoFocus
            className="w-full resize-none rounded-control border border-brand bg-surface px-3 py-3 text-sm leading-6 text-main outline-none ring-2 ring-brand/10"
          />

          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isPending}
              className="inline-flex min-h-9 items-center justify-center rounded-control border border-line bg-surface px-4 text-xs font-semibold text-secondary hover:bg-surface-muted disabled:opacity-50"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-9 items-center justify-center rounded-control bg-brand px-4 text-xs font-bold text-on-brand hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
            >
              {isPending
                ? "저장 중..."
                : "수정 저장"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-secondary">
            {content}
          </p>

          {(canEdit || canDelete) && (
            <div className="mt-2 flex flex-wrap justify-end gap-3">
              {canEdit && (
                <button
                  type="button"
                  onClick={beginEditing}
                  className="inline-flex min-h-9 items-center text-xs font-semibold text-brand-text"
                >
                  수정
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={openDeleteConfirm}
                  className="inline-flex min-h-9 items-center text-xs font-semibold text-danger"
                >
                  삭제
                </button>
              )}
            </div>
          )}
        </>
      )}

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-32px)] max-w-md rounded-card border border-line bg-surface p-0 text-main shadow-floating backdrop:bg-black/45"
      >
        {dialogMode === "delete-confirm" ? (
          <div className="p-6 sm:p-7">
            <div className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-xl font-bold text-danger">
              !
            </div>

            <h2 className="mt-5 text-xl font-bold text-main">
              댓글을 삭제할까요?
            </h2>

            <p className="mt-3 text-sm leading-6 text-secondary">
              삭제한 댓글은 다시 복구할 수 없습니다.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-5 text-sm font-semibold text-secondary hover:bg-surface-muted disabled:opacity-50"
              >
                취소
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-control bg-danger px-5 text-sm font-bold text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {isPending
                  ? "삭제 중..."
                  : "삭제하기"}
              </button>
            </div>
          </div>
        ) : (
          <ResultContent
            title={resultTitle}
            state={resultState}
            onConfirm={finishResult}
          />
        )}
      </dialog>
    </>
  );
}

function ResultDialog({
  dialogRef,
  state,
  successTitle,
  onConfirm,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  state: CommentActionState;
  successTitle: string;
  onConfirm: () => void;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-card border border-line bg-surface p-0 text-main shadow-floating backdrop:bg-black/45"
    >
      <ResultContent
        title={
          state.status === "success"
            ? successTitle
            : "처리 실패"
        }
        state={state}
        onConfirm={onConfirm}
      />
    </dialog>
  );
}

function ResultContent({
  title,
  state,
  onConfirm,
}: {
  title: string;
  state: CommentActionState;
  onConfirm: () => void;
}) {
  const success =
    state.status === "success";

  return (
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
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-secondary">
        {state.message}
      </p>

      <button
        type="button"
        onClick={onConfirm}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand px-5 text-sm font-bold text-on-brand hover:bg-brand-hover"
      >
        확인
      </button>
    </div>
  );
}
"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";

import {
  deletePost,
  type PostActionState,
} from "@/app/community/actions";
import {
  PostForm,
  type PostEditData,
} from "@/components/post-form";
import type {
  RouteStopOption,
} from "@/components/route-stop-types";

type PostManageModalProps = {
  post: PostEditData;
  stops?: RouteStopOption[];
};

const initialState: PostActionState = {
  status: "idle",
  message: "",
};

export function PostManageModal({
  post,
  stops = [],
}: PostManageModalProps) {
  const editDialogRef =
    useRef<HTMLDialogElement>(null);

  const deleteDialogRef =
    useRef<HTMLDialogElement>(null);

  const [editCompleted, setEditCompleted] =
    useState(false);

  const [deleteState, setDeleteState] =
    useState<PostActionState>(initialState);

  const [isDeleting, setIsDeleting] =
    useState(false);

  function openEditModal() {
    setEditCompleted(false);
    editDialogRef.current?.showModal();
  }

  function closeEditModal() {
    editDialogRef.current?.close();
  }

  function openDeleteModal() {
    setDeleteState(initialState);
    deleteDialogRef.current?.showModal();
  }

  function closeDeleteModal() {
    deleteDialogRef.current?.close();
  }

  const handleEditSuccess = useCallback(
    () => {
      setEditCompleted(true);
    },
    [],
  );

  function reloadPost() {
    window.location.reload();
  }

  function moveToCommunity() {
    window.location.href = "/community";
  }

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);
    setDeleteState(initialState);

    const formData = new FormData();
    formData.set("postId", post.id);

    try {
      const result =
        await deletePost(formData);

      setDeleteState(result);
    } catch {
      setDeleteState({
        status: "error",
        message:
          "게시글 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openEditModal}
          className="inline-flex min-h-10 items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold text-secondary transition-colors hover:border-brand-line hover:bg-brand-softer"
        >
          수정
        </button>

        <button
          type="button"
          onClick={openDeleteModal}
          className="inline-flex min-h-10 items-center justify-center rounded-control border border-danger/30 bg-surface px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
        >
          삭제
        </button>
      </div>

      <dialog
        ref={editDialogRef}
        aria-labelledby={`post-edit-title-${post.id}`}
        className="m-auto w-[calc(100%-32px)] max-w-3xl rounded-card border border-line bg-surface p-0 text-main shadow-floating backdrop:bg-black/45"
      >
        {editCompleted ? (
          <ResultContent
            title="수정 완료"
            message="게시글이 수정되었습니다."
            onConfirm={reloadPost}
          />
        ) : (
          <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-7">
            <ModalHeader
              titleId={`post-edit-title-${post.id}`}
              title="게시글 수정"
              description="기존 게시글 내용을 확인한 후 수정해 주세요."
              onClose={closeEditModal}
            />

            <div className="mt-6">
              <PostForm
                initialPost={post}
                stops={stops}
                onSuccess={handleEditSuccess}
              />
            </div>
          </div>
        )}
      </dialog>

      <dialog
        ref={deleteDialogRef}
        aria-labelledby={`post-delete-title-${post.id}`}
        className="m-auto w-[calc(100%-32px)] max-w-md rounded-card border border-line bg-surface p-0 text-main shadow-floating backdrop:bg-black/45"
      >
        {deleteState.status === "success" ? (
          <ResultContent
            title="삭제 완료"
            message={deleteState.message}
            onConfirm={moveToCommunity}
          />
        ) : (
          <div className="p-6 sm:p-7">
            <div className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-xl font-bold text-danger">
              !
            </div>

            <h2
              id={`post-delete-title-${post.id}`}
              className="mt-5 text-xl font-bold text-main"
            >
              게시글을 삭제할까요?
            </h2>

            <p className="mt-3 text-sm leading-6 text-secondary">
              &lsquo;{post.title}&rsquo; 게시글과 댓글이
              모두 삭제됩니다. 삭제한 내용은 복구할 수 없습니다.
            </p>

            {deleteState.status === "error" && (
              <p
                role="alert"
                className="mt-4 rounded-control bg-danger-soft p-3 text-sm text-danger"
              >
                {deleteState.message}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-5 text-sm font-semibold text-secondary hover:bg-surface-muted disabled:opacity-50"
              >
                취소
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex min-h-11 items-center justify-center rounded-control bg-danger px-5 text-sm font-bold text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {isDeleting
                  ? "삭제 중..."
                  : "삭제하기"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function ModalHeader({
  titleId,
  title,
  description,
  onClose,
}: {
  titleId: string;
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
      <div>
        <p className="text-sm font-semibold text-brand-text">
          시민 게시판
        </p>

        <h2
          id={titleId}
          className="mt-1 text-xl font-bold text-main"
        >
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-secondary">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="창 닫기"
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-2xl text-muted hover:bg-surface-muted hover:text-main"
      >
        ×
      </button>
    </div>
  );
}

function ResultContent({
  title,
  message,
  onConfirm,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
}) {
  return (
    <div className="p-6 text-center sm:p-8">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-2xl font-bold text-success">
        ✓
      </div>

      <h2 className="mt-5 text-xl font-bold text-main">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-secondary">
        {message}
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
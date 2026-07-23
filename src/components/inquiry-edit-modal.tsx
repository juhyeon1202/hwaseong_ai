"use client";

import {
  type FormEvent,
  useRef,
  useState,
} from "react";

import {
  deleteInquiry,
  updateInquiry,
  type AccountActionState,
} from "@/app/(protected)/account-actions";

type InquiryData = {
  id: string;
  title: string;
  content: string;
};

type InquiryEditModalProps = {
  inquiry: InquiryData;
};

type InquiryDeleteButtonProps = {
  inquiryId: string;
  inquiryTitle: string;
};

const initialState: AccountActionState = {
  status: "idle",
  message: "",
};

const inputClassName = [
  "min-h-11 w-full rounded-control",
  "border border-line bg-surface px-4",
  "text-sm text-main outline-none",
  "transition-colors placeholder:text-muted",
  "focus:border-brand",
].join(" ");

export function InquiryEditModal({
  inquiry,
}: InquiryEditModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [state, setState] =
    useState<AccountActionState>(initialState);

  const [isPending, setIsPending] =
    useState(false);

  function openModal() {
    setState(initialState);
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  function finishAndReload() {
    window.location.reload();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setIsPending(true);
    setState(initialState);

    const formData = new FormData(
      event.currentTarget,
    );

    try {
      const result =
        await updateInquiry(formData);

      setState(result);
    } catch {
      setState({
        status: "error",
        message:
          "문의 수정 중 오류가 발생했습니다.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex min-h-10 items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold text-secondary transition-colors hover:border-brand-line hover:bg-brand-softer"
      >
        문의 수정
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`inquiry-edit-title-${inquiry.id}`}
        className="m-auto w-[calc(100%-32px)] max-w-2xl rounded-card border border-line bg-surface p-0 text-main shadow-floating backdrop:bg-black/45"
      >
        {state.status === "success" ? (
          <ResultContent
            title="수정 완료"
            message={state.message}
            onConfirm={finishAndReload}
          />
        ) : (
          <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-7">
            <ModalHeader
              eyebrow="1:1 문의"
              title="문의 수정"
              description="기존 문의 내용을 확인한 후 수정해 주세요."
              titleId={`inquiry-edit-title-${inquiry.id}`}
              onClose={closeModal}
            />

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <input
                type="hidden"
                name="inquiryId"
                value={inquiry.id}
              />

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-main">
                  문의 제목
                </span>

                <input
                  type="text"
                  name="title"
                  required
                  minLength={2}
                  maxLength={100}
                  defaultValue={inquiry.title}
                  className={inputClassName}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-main">
                  문의 내용
                </span>

                <textarea
                  name="content"
                  required
                  minLength={5}
                  maxLength={3000}
                  rows={8}
                  defaultValue={inquiry.content}
                  className={`${inputClassName} resize-none py-3`}
                />
              </label>

              {state.status === "error" && (
                <p
                  role="alert"
                  className="rounded-control bg-danger-soft p-3 text-sm text-danger"
                >
                  {state.message}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-5 text-sm font-semibold text-secondary transition-colors hover:bg-surface-muted disabled:opacity-50"
                >
                  취소
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand px-6 text-sm font-bold text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
                >
                  {isPending
                    ? "수정 중..."
                    : "수정 내용 저장"}
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>
    </>
  );
}

export function InquiryDeleteButton({
  inquiryId,
  inquiryTitle,
}: InquiryDeleteButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [state, setState] =
    useState<AccountActionState>(initialState);

  const [isPending, setIsPending] =
    useState(false);

  function openModal() {
    setState(initialState);
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  function finishAndReload() {
    window.location.reload();
  }

  async function handleDelete() {
    if (isPending) {
      return;
    }

    setIsPending(true);
    setState(initialState);

    const formData = new FormData();
    formData.set("inquiryId", inquiryId);

    try {
      const result =
        await deleteInquiry(formData);

      setState(result);
    } catch {
      setState({
        status: "error",
        message:
          "문의 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex min-h-10 items-center justify-center rounded-control border border-danger/30 bg-surface px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
      >
        문의 삭제
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`inquiry-delete-title-${inquiryId}`}
        className="m-auto w-[calc(100%-32px)] max-w-md rounded-card border border-line bg-surface p-0 text-main shadow-floating backdrop:bg-black/45"
      >
        {state.status === "success" ? (
          <ResultContent
            title="삭제 완료"
            message={state.message}
            onConfirm={finishAndReload}
          />
        ) : (
          <div className="p-6 sm:p-7">
            <div className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-xl font-bold text-danger">
              !
            </div>

            <h2
              id={`inquiry-delete-title-${inquiryId}`}
              className="mt-5 text-xl font-bold text-main"
            >
              문의를 삭제할까요?
            </h2>

            <p className="mt-3 text-sm leading-6 text-secondary">
              &lsquo;{inquiryTitle}&rsquo; 문의가 삭제됩니다.
              삭제한 문의와 관리자 답변은 다시 복구할 수 없습니다.
            </p>

            {state.status === "error" && (
              <p
                role="alert"
                className="mt-4 rounded-control bg-danger-soft p-3 text-sm text-danger"
              >
                {state.message}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
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
        )}
      </dialog>
    </>
  );
}

function ModalHeader({
  eyebrow,
  title,
  description,
  titleId,
  onClose,
}: {
  eyebrow: string;
  title: string;
  description: string;
  titleId: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
      <div>
        <p className="text-sm font-semibold text-brand-text">
          {eyebrow}
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
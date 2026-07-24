"use client";

import {
  useCallback,
  useState,
} from "react";

import {
  deleteJournal,
} from "@/app/(protected)/journal/actions";
import {
  ActionResultModal,
} from "@/components/action-result-modal";
import {
  JournalRouteForm,
  type JournalRouteInitialData,
} from "@/components/journal-route-form";

type JournalManageModalProps = {
  journal: {
    id: string;
    category: string;
    originLabel: string;
    destinationLabel: string;
    initialData: JournalRouteInitialData;
  };
};

type ResultState = {
  open: boolean;
  title: string;
  message: string;
  status: "success" | "error";
  reload: boolean;
};

const initialResult: ResultState = {
  open: false,
  title: "",
  message: "",
  status: "success",
  reload: false,
};

export function JournalManageModal({
  journal,
}: JournalManageModalProps) {
  const [
    editOpen,
    setEditOpen,
  ] = useState(false);

  const [
    deleteOpen,
    setDeleteOpen,
  ] = useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    result,
    setResult,
  ] =
    useState<ResultState>(
      initialResult,
    );

  const handleEditSuccess =
    useCallback(
      (message: string) => {
        setEditOpen(false);

        setResult({
          open: true,
          title:
            "교통일지 수정 완료",
          message:
            message ||
            "교통일지가 수정되었습니다.",
          status: "success",
          reload: true,
        });
      },
      [],
    );

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    const formData =
      new FormData();

    formData.set(
      "journalId",
      journal.id,
    );

    try {
      await deleteJournal(formData);

      setResult({
        open: true,
        title:
          "교통일지 삭제 완료",
        message:
          "교통일지가 삭제되었습니다.",
        status: "success",
        reload: true,
      });
    } catch (error) {
      setResult({
        open: true,
        title:
          "교통일지 삭제 실패",
        message:
          error instanceof Error
            ? error.message
            : "교통일지를 삭제하지 못했습니다.",
        status: "error",
        reload: false,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  function closeResult() {
    const shouldReload =
      result.reload;

    setResult(initialResult);

    if (shouldReload) {
      window.location.reload();
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setEditOpen(true)
          }
          className="inline-flex min-h-9 items-center justify-center rounded-control border border-line bg-white px-3 text-xs font-semibold text-secondary transition-colors hover:border-brand hover:bg-brand-softer"
        >
          수정
        </button>

        <button
          type="button"
          onClick={() =>
            setDeleteOpen(true)
          }
          className="inline-flex min-h-9 items-center justify-center rounded-control border border-danger/30 bg-white px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger-soft"
        >
          삭제
        </button>
      </div>

      {editOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`journal-edit-${journal.id}`}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-3 md:p-5"
        >
          <section className="flex max-h-[94dvh] w-full max-w-[1500px] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-floating">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-brand-text">
                  나의 교통일지
                </p>

                <h2
                  id={`journal-edit-${journal.id}`}
                  className="mt-1 text-xl font-bold text-main"
                >
                  교통일지 수정
                </h2>

                <p className="mt-1 text-sm text-muted">
                  출발지와 도착지를 검색하고 이용한 추천 경로를 다시 선택해 주세요.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditOpen(false)
                }
                aria-label="수정 창 닫기"
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-2xl text-muted hover:bg-surface-muted"
              >
                ×
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              <JournalRouteForm
                journalId={journal.id}
                initialData={
                  journal.initialData
                }
                onSuccess={
                  handleEditSuccess
                }
              />
            </div>
          </section>
        </div>
      )}

      {deleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`journal-delete-${journal.id}`}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4"
        >
          <section className="w-full max-w-md rounded-card border border-line bg-white p-7 shadow-floating">
            <div className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-xl font-bold text-danger">
              !
            </div>

            <h2
              id={`journal-delete-${journal.id}`}
              className="mt-5 text-xl font-bold text-main"
            >
              교통일지를 삭제할까요?
            </h2>

            <p className="mt-3 text-sm leading-6 text-secondary">
              {journal.originLabel}
              {" → "}
              {journal.destinationLabel}
              {" 이동 기록이 삭제됩니다. 삭제한 기록은 복구할 수 없습니다."}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setDeleteOpen(false)
                }
                disabled={isDeleting}
                className="min-h-11 rounded-control border border-line bg-white px-4 text-sm font-semibold text-secondary hover:bg-surface-muted disabled:opacity-50"
              >
                취소
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleDelete()
                }
                disabled={isDeleting}
                className="min-h-11 rounded-control bg-danger px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {isDeleting
                  ? "삭제 중..."
                  : "삭제하기"}
              </button>
            </div>
          </section>
        </div>
      )}

      <ActionResultModal
        open={result.open}
        title={result.title}
        message={result.message}
        status={result.status}
        onConfirm={closeResult}
      />
    </>
  );
}

"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  ActionResultModal,
} from "@/components/action-result-modal";
import {
  Button,
} from "@/components/ui";

export type IncidentDetectionState = {
  status: "idle" | "success" | "error";
  message: string;
  runId: number;
};

const initialState: IncidentDetectionState = {
  status: "idle",
  message: "",
  runId: 0,
};

type AdminIncidentDetectionButtonProps = {
  action: (
    previousState: IncidentDetectionState,
    formData: FormData,
  ) => Promise<IncidentDetectionState>;
};

export function AdminIncidentDetectionButton({
  action,
}: AdminIncidentDetectionButtonProps) {
  const [state, formAction, isPending] =
    useActionState(
      action,
      initialState,
    );

  const [modalOpen, setModalOpen] =
    useState(false);

  useEffect(() => {
    if (state.runId > 0) {
      setModalOpen(true);
    }
  }, [state.runId]);

  return (
    <>
      <form action={formAction}>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-info hover:opacity-90"
        >
          {isPending
            ? "사건 감지 중..."
            : "지금 사건 감지 실행"}
        </Button>
      </form>

      <ActionResultModal
        open={modalOpen}
        title={
          state.status === "success"
            ? "사건 감지 완료"
            : "사건 감지 실패"
        }
        message={state.message}
        status={
          state.status === "error"
            ? "error"
            : "success"
        }
        onConfirm={() =>
          setModalOpen(false)
        }
      />
    </>
  );
}

"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";

import {
  createJournal,
  deleteJournal,
  updateJournal,
  type JournalActionState,
} from "@/app/(protected)/journal/actions";
import {
  Button,
  Card,
  SectionHeader,
} from "@/components/ui";

export type JournalFormData = {
  id: string;
  category: string;
  originLabel: string;
  destinationLabel: string;
  durationMinutes: number;
  mode: string;
  routeNumber: string;
  sentiment: string;
  reasonCodes: string[];
  memo: string;
};

type JournalFormProps = {
  journal?: JournalFormData;
  compact?: boolean;
};

const initialState: JournalActionState = {
  status: "idle",
  message: "",
};

const reasons = [
  {
    value: "crowded",
    label: "혼잡했어요",
  },
  {
    value: "delayed",
    label: "배차가 지연됐어요",
  },
  {
    value: "transfer",
    label: "환승이 불편했어요",
  },
  {
    value: "comfortable",
    label: "편안했어요",
  },
  {
    value: "on_time",
    label: "시간이 정확했어요",
  },
] as const;

export function JournalForm({
  journal,
  compact = false,
}: JournalFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const action = journal
    ? updateJournal
    : createJournal;

  const [state, formAction, isPending] =
    useActionState(
      action,
      initialState,
    );

  useEffect(() => {
    if (
      state.status === "success" &&
      !journal
    ) {
      formRef.current?.reset();
    }
  }, [state, journal]);

  const formContent = (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-5"
    >
      {journal && (
        <input
          type="hidden"
          name="journalId"
          value={journal.id}
        />
      )}

      <Field label="이동 목적">
        <select
          name="category"
          required
          defaultValue={
            journal?.category ?? ""
          }
          className={inputClassName}
        >
          <option value="" disabled>
            이동 목적 선택
          </option>

          <option value="commute">
            출근
          </option>

          <option value="return">
            귀가
          </option>

          <option value="school">
            통학
          </option>

          <option value="other">
            기타
          </option>
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="출발지">
          <input
            name="originLabel"
            required
            maxLength={100}
            defaultValue={
              journal?.originLabel
            }
            placeholder="예: 병점역"
            className={inputClassName}
          />
        </Field>

        <Field label="도착지">
          <input
            name="destinationLabel"
            required
            maxLength={100}
            defaultValue={
              journal?.destinationLabel
            }
            placeholder="예: 동탄역"
            className={inputClassName}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="이동 수단">
          <select
            name="mode"
            required
            defaultValue={
              journal?.mode ?? ""
            }
            className={inputClassName}
          >
            <option value="" disabled>
              이동 수단 선택
            </option>

            <option value="bus">
              버스
            </option>

            <option value="subway">
              지하철
            </option>

            <option value="walk">
              도보
            </option>

            <option value="taxi">
              택시
            </option>

            <option value="drt">
              똑버스
            </option>

            <option value="other">
              기타
            </option>
          </select>
        </Field>

        <Field label="이동 시간">
          <div className="relative">
            <input
              name="durationMinutes"
              type="number"
              required
              min={1}
              max={1440}
              defaultValue={
                journal?.durationMinutes
              }
              placeholder="30"
              className={`${inputClassName} pr-12`}
            />

            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted">
              분
            </span>
          </div>
        </Field>
      </div>

      <Field
        label="노선 번호"
        optional
      >
        <input
          name="routeNumber"
          maxLength={30}
          defaultValue={
            journal?.routeNumber
          }
          placeholder="예: 1001번"
          className={inputClassName}
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-semibold text-main">
          이동은 어땠나요?
        </legend>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <SentimentOption
            value="satisfied"
            label="만족했어요"
            defaultChecked={
              journal?.sentiment ===
              "satisfied"
            }
          />

          <SentimentOption
            value="dissatisfied"
            label="불편했어요"
            defaultChecked={
              journal?.sentiment ===
              "dissatisfied"
            }
            danger
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-main">
          이동 경험
        </legend>

        <p className="mt-1 text-xs text-muted">
          해당하는 항목을 모두 선택할 수 있습니다.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {reasons.map((reason) => (
            <label
              key={reason.value}
              className="cursor-pointer"
            >
              <input
                type="checkbox"
                name="reasonCodes"
                value={reason.value}
                defaultChecked={journal?.reasonCodes.includes(
                  reason.value,
                )}
                className="peer sr-only"
              />

              <span className="inline-flex min-h-10 items-center rounded-pill border border-line bg-surface px-4 text-sm text-secondary peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand-text">
                {reason.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="메모" optional>
        <textarea
          name="memo"
          rows={4}
          maxLength={500}
          defaultValue={journal?.memo}
          placeholder="이동 중 기억에 남는 점을 적어 주세요."
          className={`${inputClassName} resize-none py-3`}
        />
      </Field>

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

      <Button
        type="submit"
        fullWidth
        disabled={isPending}
      >
        {isPending
          ? "저장 중..."
          : journal
            ? "수정 내용 저장"
            : "교통일지 저장"}
      </Button>
    </form>
  );

  if (compact) {
    return formContent;
  }

  return (
    <Card>
      <SectionHeader
        title="오늘의 이동 기록"
        description="이동 경험을 간단하게 남겨 주세요."
      />

      <div className="mt-5">
        {formContent}
      </div>
    </Card>
  );
}

type DeleteJournalButtonProps = {
  journalId: string;
};

export function DeleteJournalButton({
  journalId,
}: DeleteJournalButtonProps) {
  function confirmDelete(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    const confirmed = window.confirm(
      "이 교통일지를 삭제할까요? 삭제한 기록은 복구할 수 없습니다.",
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={deleteJournal}
      onSubmit={confirmDelete}
    >
      <input
        type="hidden"
        name="journalId"
        value={journalId}
      />

      <Button
        type="submit"
        variant="danger"
        className="w-full sm:w-auto"
      >
        삭제
      </Button>
    </form>
  );
}

type SentimentOptionProps = {
  value: string;
  label: string;
  defaultChecked: boolean;
  danger?: boolean;
};

function SentimentOption({
  value,
  label,
  defaultChecked,
  danger = false,
}: SentimentOptionProps) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name="sentiment"
        value={value}
        required
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />

      <span
        className={[
          "flex min-h-12 items-center justify-center rounded-control border border-line bg-surface text-sm font-semibold text-secondary",
          danger
            ? "peer-checked:border-danger peer-checked:bg-danger-soft peer-checked:text-danger"
            : "peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand-text",
        ].join(" ")}
      >
        {label}
      </span>
    </label>
  );
}

type FieldProps = {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
};

function Field({
  label,
  optional = false,
  children,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-main">
        {label}

        {optional && (
          <span className="text-xs font-normal text-muted">
            선택
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

const inputClassName = [
  "min-h-11 w-full rounded-control",
  "border border-line bg-surface",
  "px-3 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-brand",
].join(" ");
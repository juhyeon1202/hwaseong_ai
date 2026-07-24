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
  Badge,
  Button,
  Card,
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

export type JournalInitialValues =
  Partial<Omit<JournalFormData, "id">>;

type JournalFormProps = {
  journal?: JournalFormData;
  initialValues?: JournalInitialValues;
  compact?: boolean;
  onSuccess?: (
    message: string,
  ) => void;
};

const initialState: JournalActionState = {
  status: "idle",
  message: "",
};

const categories = [
  {
    value: "commute",
    label: "출근",
    description: "집 → 회사",
    icon: "가",
  },
  {
    value: "return",
    label: "퇴근",
    description: "회사 → 집",
    icon: "집",
  },
  {
    value: "school",
    label: "등하교",
    description: "집 ↔ 학교",
    icon: "학",
  },
  {
    value: "other",
    label: "기타 이동",
    description: "직접 입력",
    icon: "＋",
  },
] as const;

const reasons = [
  {
    value: "crowded",
    label: "혼잡",
  },
  {
    value: "delayed",
    label: "배차 지연",
  },
  {
    value: "transfer",
    label: "환승 불편",
  },
  {
    value: "comfortable",
    label: "쾌적함",
  },
  {
    value: "on_time",
    label: "정시 도착",
  },
] as const;

export function JournalForm({
  journal,
  initialValues,
  compact = false,
  onSuccess,
}: JournalFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const action = journal
    ? updateJournal
    : createJournal;

  const values =
    journal ?? initialValues;

  const [state, formAction, isPending] =
    useActionState(
      action,
      initialState,
    );

  useEffect(() => {
    if (
      state.status !== "success"
    ) {
      return;
    }

    if (journal) {
      onSuccess?.(
        state.message ||
          "교통일지가 수정되었습니다.",
      );

      return;
    }

    formRef.current?.reset();
  }, [
    journal,
    onSuccess,
    state.status,
    state.message,
  ]);

  const form = (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6"
    >
      {journal && (
        <input
          type="hidden"
          name="journalId"
          value={journal.id}
        />
      )}

      {initialValues && !journal && (
        <div className="rounded-control border border-info/25 bg-info-soft p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">
              경로 정보 연결됨
            </Badge>

            <span className="text-xs leading-5 text-secondary">
              길찾기에서 선택한 경로가
              자동으로 입력되었습니다.
            </span>
          </div>
        </div>
      )}

      <fieldset>
        <legend className="text-lg font-bold text-main">
          어떤 이동인가요?
        </legend>

        <p className="mt-1 text-xs leading-5 text-muted">
          카테고리를 누르면 오늘의 이동
          기록을 시작할 수 있어요.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <label
              key={category.value}
              className="cursor-pointer"
            >
              <input
                type="radio"
                name="category"
                value={category.value}
                required
                defaultChecked={
                  values?.category
                    ? values.category ===
                      category.value
                    : category.value ===
                      "commute"
                }
                className="peer sr-only"
              />

              <span
                className={[
                  "flex min-h-[104px] flex-col",
                  "items-center justify-center",
                  "rounded-card border border-line",
                  "bg-white p-4 text-center",
                  "transition-colors",
                  "peer-checked:border-brand",
                  "peer-checked:bg-brand-softer",
                  "peer-checked:shadow-card",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-9 items-center justify-center",
                    "rounded-control bg-surface-muted",
                    "text-xs font-extrabold text-secondary",
                    "peer-checked:bg-brand-soft",
                  ].join(" ")}
                >
                  {category.icon}
                </span>

                <strong className="mt-2 text-sm text-main peer-checked:text-brand-text">
                  {category.label}
                </strong>

                <span className="mt-1 text-[11px] text-muted">
                  {category.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="rounded-card border border-line bg-white p-4">
        <h3 className="text-sm font-bold text-main">
          이동 경로
        </h3>

        <div className="mt-4 space-y-3">
          <RouteField
            label="출발"
            dotClassName="bg-info"
          >
            <input
              name="originLabel"
              required
              maxLength={100}
              defaultValue={
                values?.originLabel ?? ""
              }
              placeholder="출발지를 입력하세요"
              className={routeInputClassName}
            />
          </RouteField>

          <div className="ml-[17px] h-5 border-l-2 border-dashed border-line" />

          <RouteField
            label="도착"
            dotClassName="bg-brand"
          >
            <input
              name="destinationLabel"
              required
              maxLength={100}
              defaultValue={
                values?.destinationLabel ??
                ""
              }
              placeholder="도착지를 입력하세요"
              className={routeInputClassName}
            />
          </RouteField>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="이동 수단">
          <select
            name="mode"
            required
            defaultValue={
              values?.mode ?? "bus"
            }
            className={inputClassName}
          >
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
              복합 이동 또는 기타
            </option>
          </select>
        </Field>

        <Field label="총 이동 시간">
          <div className="relative">
            <input
              name="durationMinutes"
              type="number"
              required
              min={1}
              max={1440}
              defaultValue={
                values?.durationMinutes ??
                ""
              }
              placeholder="33"
              className={`${inputClassName} pr-12`}
            />

            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted">
              분
            </span>
          </div>
        </Field>
      </div>

      <Field
        label="노선번호"
        optional
      >
        <input
          name="routeNumber"
          maxLength={30}
          defaultValue={
            values?.routeNumber ?? ""
          }
          placeholder="예: 56번"
          className={inputClassName}
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-bold text-main">
          이번 이동은 어땠나요?
        </legend>

        <p className="mt-1 text-xs text-muted">
          이동 전체에 대한 만족도를
          선택해 주세요.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <SentimentOption
            value="satisfied"
            label="만족"
            description="편안하게 이동했어요"
            defaultChecked={
              values?.sentiment
                ? values.sentiment ===
                  "satisfied"
                : true
            }
          />

          <SentimentOption
            value="dissatisfied"
            label="불만족"
            description="불편한 점이 있었어요"
            defaultChecked={
              values?.sentiment ===
              "dissatisfied"
            }
            danger
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-bold text-main">
          기억에 남는 점
        </legend>

        <p className="mt-1 text-xs text-muted">
          여러 항목을 선택할 수 있습니다.
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
                defaultChecked={
                  values?.reasonCodes?.includes(
                    reason.value,
                  ) ?? false
                }
                className="peer sr-only"
              />

              <span
                className={[
                  "inline-flex min-h-10 items-center",
                  "rounded-pill border border-line",
                  "bg-white px-4 text-sm",
                  "font-semibold text-secondary",
                  "peer-checked:border-[#191f28]",
                  "peer-checked:bg-[#191f28]",
                  "peer-checked:text-white",
                ].join(" ")}
              >
                {reason.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="상세 메모" optional>
        <textarea
          name="memo"
          rows={4}
          maxLength={500}
          defaultValue={
            values?.memo ?? ""
          }
          placeholder="이동 중 불편했거나 좋았던 점을 적어 주세요."
          className={`${inputClassName} resize-none py-3 leading-6`}
        />
      </Field>

      {state.message &&
        state.status === "error" && (
          <p
            role="alert"
            className={[
              "rounded-control px-4 py-3",
              "bg-danger-soft text-danger",
              "text-sm leading-6",
            ].join(" ")}
          >
            {state.message}
          </p>
        )}

      <Button
        type="submit"
        fullWidth
        disabled={isPending}
        className="min-h-12 text-base"
      >
        {isPending
          ? "저장 중..."
          : journal
            ? "수정 내용 저장"
            : "오늘의 교통일지 저장"}
      </Button>
    </form>
  );

  if (compact) {
    return form;
  }

  return (
    <Card>
      <header className="border-b border-line-light pb-4">
        <p className="text-xs font-semibold text-brand">
          오늘의 이동
        </p>

        <h2 className="mt-1 text-xl font-bold text-main">
          교통일지 기록
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          이동 경로와 만족도를 간단히
          기록해 주세요.
        </p>
      </header>

      <div className="mt-6">
        {form}
      </div>
    </Card>
  );
}

type RouteFieldProps = {
  label: string;
  dotClassName: string;
  children: React.ReactNode;
};

function RouteField({
  label,
  dotClassName,
  children,
}: RouteFieldProps) {
  return (
    <label className="flex items-center gap-3">
      <span
        className={[
          "size-3 shrink-0 rounded-full",
          dotClassName,
        ].join(" ")}
      />

      <span className="w-10 shrink-0 text-xs font-semibold text-muted">
        {label}
      </span>

      <span className="min-w-0 flex-1">
        {children}
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

type SentimentOptionProps = {
  value: string;
  label: string;
  description: string;
  defaultChecked: boolean;
  danger?: boolean;
};

function SentimentOption({
  value,
  label,
  description,
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
          "flex min-h-[78px] flex-col",
          "items-center justify-center",
          "rounded-control border border-line",
          "bg-white px-3 text-center",
          danger
            ? [
                "peer-checked:border-danger",
                "peer-checked:bg-danger-soft",
                "peer-checked:text-danger",
              ].join(" ")
            : [
                "peer-checked:border-brand",
                "peer-checked:bg-brand-soft",
                "peer-checked:text-brand-text",
              ].join(" "),
        ].join(" ")}
      >
        <strong className="text-sm">
          {label}
        </strong>

        <span className="mt-1 text-[11px] opacity-75">
          {description}
        </span>
      </span>
    </label>
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

const inputClassName = [
  "min-h-12 w-full rounded-control",
  "border border-line bg-white",
  "px-4 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-brand",
  "focus:ring-2 focus:ring-brand-soft",
].join(" ");

const routeInputClassName = [
  "min-h-11 w-full rounded-control",
  "border border-line bg-surface-muted",
  "px-3 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-info focus:bg-white",
].join(" ");
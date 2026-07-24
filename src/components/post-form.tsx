"use client";

import {
  type ReactNode,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createPost,
  createRouteSuggestionPost,
  updatePost,
  updateRouteSuggestionPost,
  type PostActionState,
} from "@/app/community/actions";
import {
  requiredRouteSuggestionStops,
  RouteSuggestionFields,
} from "@/components/route-suggestion-fields";
import type { RouteStopOption } from "@/components/route-stop-types";
import {
  Button,
  Card,
  SectionHeader,
} from "@/components/ui";

export type PostEditData = {
  id: string;
  category: string;
  busType: string;
  title: string;
  content: string;
  routeStops?: RouteStopOption[];
};

type PostFormProps = {
  initialPost?: PostEditData;
  stops?: RouteStopOption[];
  onSuccess?: (message: string) => void;
};

const initialState: PostActionState = {
  status: "idle",
  message: "",
};

export function PostForm({
  initialPost,
  stops = [],
  onSuccess,
}: PostFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const isEditMode = Boolean(initialPost);

  const [category, setCategory] = useState(
    initialPost?.category ?? "",
  );

  const [selectedStopCount, setSelectedStopCount] = useState(
    initialPost?.routeStops?.length ?? 0,
  );

  const isRouteSuggestion =
    category === "route_suggestion";

  const hasRequiredStops =
    selectedStopCount === requiredRouteSuggestionStops;

  const action = isRouteSuggestion
    ? isEditMode
      ? updateRouteSuggestionPost
      : createRouteSuggestionPost
    : isEditMode
      ? updatePost
      : createPost;

  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );

  useEffect(() => {
    if (
      state.status !== "success" ||
      isEditMode
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      formRef.current?.reset();
      setCategory("");
      setSelectedStopCount(0);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    state.status,
    isEditMode,
  ]);

  useEffect(() => {
    if (
      state.status === "success" &&
      isEditMode
    ) {
      onSuccess?.(state.message);
    }
  }, [
    state.status,
    state.message,
    isEditMode,
    onSuccess,
  ]);

  function handleCategoryChange(
    nextCategory: string,
  ) {
    setCategory(nextCategory);

    if (nextCategory !== "route_suggestion") {
      setSelectedStopCount(0);
      return;
    }

    setSelectedStopCount(
      initialPost?.category === "route_suggestion"
        ? initialPost.routeStops?.length ?? 0
        : 0,
    );
  }

  const submitDisabled =
    isPending ||
    (isRouteSuggestion && !hasRequiredStops);

  const submitLabel = getSubmitLabel({
    isPending,
    isEditMode,
    isRouteSuggestion,
    hasRequiredStops,
  });

  return (
    <Card>
      <SectionHeader
        title={
          isEditMode
            ? "게시글 수정"
            : "게시글 작성"
        }
        description={
          isEditMode
            ? "작성한 게시글 내용을 확인한 후 수정해 주세요."
            : "화성시 교통 정보와 의견을 시민들과 공유해 보세요."
        }
      />

      <form
        ref={formRef}
        action={formAction}
        className="mt-5 space-y-5"
      >
        {initialPost && (
          <input
            type="hidden"
            name="postId"
            value={initialPost.id}
          />
        )}

        <Field label="게시글 분류">
          <select
            name="category"
            required
            value={category}
            onChange={(event) =>
              handleCategoryChange(
                event.target.value,
              )
            }
            className={inputClassName}
          >
            <option
              value=""
              disabled
            >
              분류 선택
            </option>

            <option value="route_suggestion">
              노선 제안
            </option>

            <option value="information">
              교통 정보
            </option>

            <option value="question">
              질문
            </option>
          </select>
        </Field>

        {/*
          노선 제안 수정 시에는 버스 유형을 표시하지 않습니다.
          서버 액션의 FormData 형식을 유지하기 위해 숨겨진 값만 전송합니다.
        */}
        {isEditMode ? (
          <input
            type="hidden"
            name="busType"
            value={
              initialPost?.busType ?? ""
            }
          />
        ) : (
          <Field
            label="버스 유형"
            optional
          >
            <select
              name="busType"
              defaultValue=""
              className={inputClassName}
            >
              <option value="">
                선택 안 함
              </option>

              <option value="city">
                시내버스
              </option>

              <option value="village">
                마을버스
              </option>

              <option value="other">
                기타
              </option>
            </select>
          </Field>
        )}

        <Field
          label={
            isRouteSuggestion
              ? "노선 이름"
              : "제목"
          }
        >
          <input
            name="title"
            required
            minLength={2}
            maxLength={100}
            defaultValue={initialPost?.title}
            placeholder={
              isRouteSuggestion
                ? "예: 병점역-동탄역 출근 급행"
                : "게시글 제목을 입력해 주세요."
            }
            className={inputClassName}
          />
        </Field>

        <Field
          label={
            isRouteSuggestion
              ? "제안 이유"
              : "내용"
          }
        >
          <textarea
            name="content"
            required
            minLength={5}
            maxLength={5000}
            rows={7}
            defaultValue={initialPost?.content}
            placeholder={
              isRouteSuggestion
                ? "필요한 시간대와 노선이 필요한 이유를 작성해 주세요."
                : "교통 정보나 의견을 자세히 작성해 주세요."
            }
            className={`${inputClassName} resize-none py-3`}
          />
        </Field>

        {isRouteSuggestion && (
          <RouteSuggestionFields
            stops={stops}
            initialStops={
              initialPost?.routeStops ?? []
            }
            onSelectedCountChange={
              setSelectedStopCount
            }
          />
        )}

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
          disabled={submitDisabled}
        >
          {submitLabel}
        </Button>
      </form>
    </Card>
  );
}

type SubmitLabelOptions = {
  isPending: boolean;
  isEditMode: boolean;
  isRouteSuggestion: boolean;
  hasRequiredStops: boolean;
};

function getSubmitLabel({
  isPending,
  isEditMode,
  isRouteSuggestion,
  hasRequiredStops,
}: SubmitLabelOptions) {
  if (isPending) {
    return "저장 중...";
  }

  if (
    isRouteSuggestion &&
    !hasRequiredStops
  ) {
    return `정류장 ${requiredRouteSuggestionStops}개를 선택해야 합니다`;
  }

  if (isEditMode) {
    return "수정 내용 저장";
  }

  if (isRouteSuggestion) {
    return "노선 제안 등록";
  }

  return "게시글 등록";
}

type FieldProps = {
  label: string;
  optional?: boolean;
  children: ReactNode;
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
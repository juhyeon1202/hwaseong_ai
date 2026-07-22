"use client";

import {
  type FormEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createFavorite,
  createInquiry,
  deleteFavorite,
  type AccountActionState,
} from "@/app/(protected)/account-actions";
import {
  Button,
  Card,
  SectionHeader,
} from "@/components/ui";

export type FavoriteStopOption = {
  id: number;
  name: string;
  stopNumber: string | null;
};

export type FavoriteRouteOption = {
  id: number;
  routeNumber: string;
  startStopName: string | null;
  endStopName: string | null;
};

const initialState: AccountActionState = {
  status: "idle",
  message: "",
};

type FavoriteFormProps = {
  stops: FavoriteStopOption[];
  routes: FavoriteRouteOption[];
};

export function FavoriteForm({
  stops,
  routes,
}: FavoriteFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [favoriteType, setFavoriteType] =
    useState<
      "place" | "stop" | "route"
    >("place");

  const [state, formAction, isPending] =
    useActionState(
      createFavorite,
      initialState,
    );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setFavoriteType("place");
    }
  }, [state.status]);

  return (
    <Card>
      <SectionHeader
        title="즐겨찾기 추가"
        description="자주 이용하는 장소와 정류장, 노선을 저장하세요."
      />

      <form
        ref={formRef}
        action={formAction}
        className="mt-5 space-y-5"
      >
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-main">
            유형
          </span>

          <select
            name="favoriteType"
            value={favoriteType}
            onChange={(event) =>
              setFavoriteType(
                event.target.value as
                  | "place"
                  | "stop"
                  | "route",
              )
            }
            className={inputClassName}
          >
            <option value="place">
              장소
            </option>

            <option value="stop">
              정류장
            </option>

            <option value="route">
              버스 노선
            </option>
          </select>
        </label>

        {favoriteType === "place" && (
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-main">
                장소 이름
              </span>

              <input
                name="label"
                required
                maxLength={100}
                placeholder="예: 우리 집"
                className={inputClassName}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-main">
                주소
              </span>

              <input
                name="address"
                maxLength={300}
                placeholder="예: 경기도 화성시"
                className={inputClassName}
              />
            </label>
          </>
        )}

        {favoriteType === "stop" && (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-main">
              정류장
            </span>

            <select
              name="stopId"
              required
              defaultValue=""
              className={inputClassName}
            >
              <option value="" disabled>
                정류장 선택
              </option>

              {stops.map((stop) => (
                <option
                  key={stop.id}
                  value={stop.id}
                >
                  {stop.name}
                  {stop.stopNumber
                    ? ` (${stop.stopNumber})`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {favoriteType === "route" && (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-main">
              버스 노선
            </span>

            <select
              name="routeId"
              required
              defaultValue=""
              className={inputClassName}
            >
              <option value="" disabled>
                버스 노선 선택
              </option>

              {routes.map((route) => (
                <option
                  key={route.id}
                  value={route.id}
                >
                  {route.routeNumber}번
                  {route.startStopName &&
                  route.endStopName
                    ? ` · ${route.startStopName} → ${route.endStopName}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {state.message && (
          <ActionMessage
            state={state}
          />
        )}

        <Button
          type="submit"
          fullWidth
          disabled={isPending}
        >
          {isPending
            ? "저장 중..."
            : "즐겨찾기 추가"}
        </Button>
      </form>
    </Card>
  );
}

export function DeleteFavoriteButton({
  favoriteId,
}: {
  favoriteId: string;
}) {
  function confirmDelete(
    event: FormEvent<HTMLFormElement>,
  ) {
    if (
      !window.confirm(
        "즐겨찾기에서 삭제할까요?",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={deleteFavorite}
      onSubmit={confirmDelete}
    >
      <input
        type="hidden"
        name="favoriteId"
        value={favoriteId}
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

export function InquiryForm() {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] =
    useActionState(
      createInquiry,
      initialState,
    );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <Card>
      <SectionHeader
        title="1:1 문의"
        description="서비스 이용 중 궁금한 점을 남겨 주세요."
      />

      <form
        ref={formRef}
        action={formAction}
        className="mt-5 space-y-5"
      >
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-main">
            제목
          </span>

          <input
            name="title"
            required
            minLength={2}
            maxLength={100}
            placeholder="문의 제목"
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
            rows={6}
            placeholder="문의 내용을 자세히 작성해 주세요."
            className={`${inputClassName} resize-none py-3`}
          />
        </label>

        {state.message && (
          <ActionMessage
            state={state}
          />
        )}

        <Button
          type="submit"
          fullWidth
          disabled={isPending}
        >
          {isPending
            ? "등록 중..."
            : "문의 등록"}
        </Button>
      </form>
    </Card>
  );
}

function ActionMessage({
  state,
}: {
  state: AccountActionState;
}) {
  return (
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
  );
}

const inputClassName = [
  "min-h-11 w-full rounded-control",
  "border border-line bg-surface",
  "px-3 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-brand",
].join(" ");
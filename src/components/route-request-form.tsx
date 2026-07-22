"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createRouteRequest,
  type RouteRequestActionState,
} from "@/app/route-requests/actions";
import {
  Button,
  Card,
  SectionHeader,
} from "@/components/ui";

export type RouteStopOption = {
  id: number;
  name: string;
  stopNumber: string | null;
  districtName: string | null;
};

type RouteRequestFormProps = {
  stops: RouteStopOption[];
};

const initialState: RouteRequestActionState = {
  status: "idle",
  message: "",
};

export function RouteRequestForm({
  stops,
}: RouteRequestFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] =
    useActionState(
      createRouteRequest,
      initialState,
    );

  const [search, setSearch] =
    useState("");

  const [selectedStops, setSelectedStops] =
    useState<RouteStopOption[]>([]);

  const filteredStops = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (keyword.length < 2) {
      return [];
    }

    return stops
      .filter((stop) => {
        const text = [
          stop.name,
          stop.stopNumber ?? "",
          stop.districtName ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(keyword);
      })
      .filter(
        (stop) =>
          !selectedStops.some(
            (selected) =>
              selected.id === stop.id,
          ),
      )
      .slice(0, 10);
  }, [
    search,
    selectedStops,
    stops,
  ]);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setSelectedStops([]);
      setSearch("");
    }
  }, [state]);

  function addStop(
    stop: RouteStopOption,
  ) {
    setSelectedStops(
      (currentStops) => [
        ...currentStops,
        stop,
      ],
    );

    setSearch("");
  }

  function removeStop(stopId: number) {
    setSelectedStops(
      (currentStops) =>
        currentStops.filter(
          (stop) =>
            stop.id !== stopId,
        ),
    );
  }

  function moveStop(
    index: number,
    direction: -1 | 1,
  ) {
    const targetIndex =
      index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >=
        selectedStops.length
    ) {
      return;
    }

    setSelectedStops(
      (currentStops) => {
        const nextStops = [
          ...currentStops,
        ];

        const temporary =
          nextStops[index];

        nextStops[index] =
          nextStops[targetIndex];

        nextStops[targetIndex] =
          temporary;

        return nextStops;
      },
    );
  }

  return (
    <Card>
      <SectionHeader
        title="희망 노선 제안"
        description="필요한 정류장을 이동 순서대로 선택해 주세요."
      />

      <form
        ref={formRef}
        action={formAction}
        className="mt-5 space-y-5"
      >
        <Field label="노선 제목">
          <input
            name="title"
            required
            minLength={2}
            maxLength={100}
            placeholder="예: 병점역-동탄역 출근 급행"
            className={inputClassName}
          />
        </Field>

        <Field label="제안 내용">
          <textarea
            name="description"
            required
            minLength={5}
            maxLength={3000}
            rows={4}
            placeholder="필요한 시간대와 노선이 필요한 이유를 작성해 주세요."
            className={`${inputClassName} resize-none py-3`}
          />
        </Field>

        <div>
          <label
            htmlFor="stop-search"
            className="text-sm font-semibold text-main"
          >
            정류장 검색
          </label>

          <p className="mt-1 text-xs text-muted">
            정류장을 최소 5개 선택해야 합니다.
          </p>

          <input
            id="stop-search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="정류장명 또는 정류장 번호"
            className={`${inputClassName} mt-2`}
          />

          {filteredStops.length > 0 && (
            <ul className="mt-2 max-h-64 overflow-y-auto rounded-control border border-line bg-surface">
              {filteredStops.map(
                (stop) => (
                  <li
                    key={stop.id}
                    className="border-b border-line-light last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        addStop(stop)
                      }
                      className="min-h-14 w-full px-4 py-3 text-left active:bg-surface-muted"
                    >
                      <strong className="block text-sm text-main">
                        {stop.name}
                      </strong>

                      <span className="mt-1 block text-xs text-muted">
                        {[
                          stop.stopNumber,
                          stop.districtName,
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                          "상세 정보 없음"}
                      </span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}

          {search.trim().length >= 2 &&
            filteredStops.length === 0 && (
              <p className="mt-2 text-xs text-muted">
                선택할 수 있는 정류장이 없습니다.
              </p>
            )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-main">
              선택한 정류장
            </h3>

            <span className="text-xs font-semibold text-brand-text">
              {selectedStops.length}개
            </span>
          </div>

          {selectedStops.length === 0 ? (
            <div className="mt-2 rounded-control border border-dashed border-line p-5 text-center text-sm text-muted">
              아직 선택한 정류장이 없습니다.
            </div>
          ) : (
            <ol className="mt-2 space-y-2">
              {selectedStops.map(
                (stop, index) => (
                  <li
                    key={stop.id}
                    className="flex items-center gap-3 rounded-control bg-surface-muted p-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand text-xs font-bold text-on-brand">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-main">
                        {stop.name}
                      </strong>

                      <span className="block truncate text-xs text-muted">
                        {stop.stopNumber ??
                          "정류장 번호 없음"}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <OrderButton
                        label="위로 이동"
                        disabled={
                          index === 0
                        }
                        onClick={() =>
                          moveStop(
                            index,
                            -1,
                          )
                        }
                      >
                        ↑
                      </OrderButton>

                      <OrderButton
                        label="아래로 이동"
                        disabled={
                          index ===
                          selectedStops.length -
                            1
                        }
                        onClick={() =>
                          moveStop(
                            index,
                            1,
                          )
                        }
                      >
                        ↓
                      </OrderButton>

                      <button
                        type="button"
                        onClick={() =>
                          removeStop(
                            stop.id,
                          )
                        }
                        aria-label={`${stop.name} 삭제`}
                        className="flex size-9 items-center justify-center rounded-control text-sm font-bold text-danger active:bg-danger-soft"
                      >
                        ×
                      </button>
                    </div>

                    <input
                      type="hidden"
                      name="stopIds"
                      value={stop.id}
                    />
                  </li>
                ),
              )}
            </ol>
          )}
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

        <Button
          type="submit"
          fullWidth
          disabled={
            isPending ||
            selectedStops.length < 5
          }
        >
          {isPending
            ? "등록 중..."
            : "희망 노선 등록"}
        </Button>
      </form>
    </Card>
  );
}

type OrderButtonProps = {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function OrderButton({
  label,
  disabled,
  onClick,
  children,
}: OrderButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-control text-sm font-bold text-secondary active:bg-surface disabled:opacity-30"
    >
      {children}
    </button>
  );
}

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

function Field({
  label,
  children,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-main">
        {label}
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
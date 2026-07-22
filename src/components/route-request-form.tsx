"use client";

import {
  type FormEvent,
  type ReactNode,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createRouteRequest,
  deleteRouteRequest,
  updateRouteRequest,
  type RouteRequestActionState,
} from "@/app/route-requests/actions";
import {
  Button,
  Card,
  SectionHeader,
} from "@/components/ui";

import {
  RouteStopMap,
} from "@/components/route-stop-map";

export type RouteStopOption = {
  id: number;
  name: string;
  stopNumber: string | null;
  districtName: string | null;
};

export type RouteRequestEditData = {
  id: string;
  title: string;
  description: string;
  stops: RouteStopOption[];
};

type RouteRequestFormProps = {
  stops: RouteStopOption[];
  initialRequest?: RouteRequestEditData;
};

const initialState: RouteRequestActionState = {
  status: "idle",
  message: "",
};

export function RouteRequestForm({
  stops,
  initialRequest,
}: RouteRequestFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const isEditMode =
    Boolean(initialRequest);

  const action = isEditMode
    ? updateRouteRequest
    : createRouteRequest;

  const [state, formAction, isPending] =
    useActionState(
      action,
      initialState,
    );

  const [search, setSearch] =
    useState("");

  const [
    selectedStops,
    setSelectedStops,
  ] = useState<RouteStopOption[]>(
    initialRequest?.stops ?? [],
  );

  const filteredStops = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (keyword.length < 2) {
      return [];
    }

    return stops
      .filter((stop) => {
        const searchableText = [
          stop.name,
          stop.stopNumber ?? "",
          stop.districtName ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          keyword,
        );
      })
      .filter(
        (stop) =>
          !selectedStops.some(
            (selectedStop) =>
              selectedStop.id ===
              stop.id,
          ),
      )
      .slice(0, 10);
  }, [
    search,
    selectedStops,
    stops,
  ]);

  useEffect(() => {
    if (
      state.status === "success" &&
      !isEditMode
    ) {
      formRef.current?.reset();
      setSelectedStops([]);
      setSearch("");
    }
  }, [
    state.status,
    isEditMode,
  ]);

  function addStop(
    stop: RouteStopOption,
  ) {
    setSelectedStops(
      (currentStops) => {
        const alreadySelected =
          currentStops.some(
            (currentStop) =>
              currentStop.id === stop.id,
          );

        if (alreadySelected) {
          return currentStops;
        }

        return [
          ...currentStops,
          stop,
        ];
      },
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
    currentIndex: number,
    direction: -1 | 1,
  ) {
    const targetIndex =
      currentIndex + direction;

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

        const currentStop =
          nextStops[currentIndex];

        nextStops[currentIndex] =
          nextStops[targetIndex];

        nextStops[targetIndex] =
          currentStop;

        return nextStops;
      },
    );
  }

  return (
    <Card>
      <SectionHeader
        title={
          isEditMode
            ? "희망 노선 수정"
            : "희망 노선 제안"
        }
        description={
          isEditMode
            ? "노선 정보와 정류장 순서를 변경할 수 있습니다."
            : "필요한 정류장을 이동 순서대로 선택해 주세요."
        }
      />

      <form
        ref={formRef}
        action={formAction}
        className="mt-5 space-y-5"
      >
        {initialRequest && (
          <input
            type="hidden"
            name="routeRequestId"
            value={initialRequest.id}
          />
        )}

        <Field label="노선 제목">
          <input
            name="title"
            required
            minLength={2}
            maxLength={100}
            defaultValue={
              initialRequest?.title
            }
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
            defaultValue={
              initialRequest?.description
            }
            placeholder="필요한 시간대와 노선이 필요한 이유를 작성해 주세요."
            className={`${inputClassName} resize-none py-3`}
          />
        </Field>

        <div>
          <label
            htmlFor={
              isEditMode
                ? "edit-stop-search"
                : "create-stop-search"
            }
            className="text-sm font-semibold text-main"
          >
            정류장 검색
          </label>

          <p className="mt-1 text-xs text-muted">
            정류장을 이동 순서대로 최소
            5개 선택해야 합니다.
          </p>

          <input
            id={
              isEditMode
                ? "edit-stop-search"
                : "create-stop-search"
            }
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
                        {formatStopDetail(
                          stop,
                        )}
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
                선택할 수 있는 정류장이
                없습니다.
              </p>
            )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-main">
              선택한 정류장
            </h3>

            <span
              className={[
                "text-xs font-semibold",
                selectedStops.length >= 5
                  ? "text-success"
                  : "text-brand-text",
              ].join(" ")}
            >
              {selectedStops.length}개
            </span>
          </div>

          {selectedStops.length === 0 ? (
            <div className="mt-2 rounded-control border border-dashed border-line p-5 text-center">
              <p className="text-sm text-muted">
                아직 선택한 정류장이
                없습니다.
              </p>
            </div>
          ) : (
            <ol className="mt-2 space-y-2">
              {selectedStops.map(
                (stop, index) => (
                  <SelectedStopItem
                    key={stop.id}
                    stop={stop}
                    index={index}
                    totalCount={
                      selectedStops.length
                    }
                    onMove={moveStop}
                    onRemove={removeStop}
                  />
                ),
              )}
            </ol>
          )}

          {selectedStops.length > 0 &&
            selectedStops.length < 5 && (
              <p className="mt-2 text-xs text-warning">
                정류장을{" "}
                {5 -
                  selectedStops.length}
                개 더 선택해 주세요.
              </p>
            )}
          {selectedStops.length > 0 && (
            <div className="mt-4">
              <RouteStopMap
                stopIds={selectedStops.map(
                  (stop) => stop.id,
                )}
              />
            </div>
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
            ? "저장 중..."
            : isEditMode
              ? "수정 내용 저장"
              : "희망 노선 등록"}
        </Button>
      </form>
    </Card>
  );
}

type SelectedStopItemProps = {
  stop: RouteStopOption;
  index: number;
  totalCount: number;
  onMove: (
    index: number,
    direction: -1 | 1,
  ) => void;
  onRemove: (stopId: number) => void;
};

function SelectedStopItem({
  stop,
  index,
  totalCount,
  onMove,
  onRemove,
}: SelectedStopItemProps) {
  return (
    <li className="flex items-center gap-3 rounded-control bg-surface-muted p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand text-xs font-bold text-on-brand">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm text-main">
          {stop.name}
        </strong>

        <span className="mt-1 block truncate text-xs text-muted">
          {formatStopDetail(stop)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <OrderButton
          label={`${stop.name} 위로 이동`}
          disabled={index === 0}
          onClick={() =>
            onMove(index, -1)
          }
        >
          ↑
        </OrderButton>

        <OrderButton
          label={`${stop.name} 아래로 이동`}
          disabled={
            index === totalCount - 1
          }
          onClick={() =>
            onMove(index, 1)
          }
        >
          ↓
        </OrderButton>

        <button
          type="button"
          onClick={() =>
            onRemove(stop.id)
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
  );
}

type OrderButtonProps = {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
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
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-control text-sm font-bold text-secondary active:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

type DeleteRouteRequestButtonProps = {
  routeRequestId: string;
};

export function DeleteRouteRequestButton({
  routeRequestId,
}: DeleteRouteRequestButtonProps) {
  function confirmDelete(
    event: FormEvent<HTMLFormElement>,
  ) {
    const confirmed = window.confirm(
      "이 희망 노선을 삭제할까요? 정류장과 투표 정보도 함께 삭제되며 복구할 수 없습니다.",
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={deleteRouteRequest}
      onSubmit={confirmDelete}
    >
      <input
        type="hidden"
        name="routeRequestId"
        value={routeRequestId}
      />

      <Button
        type="submit"
        variant="danger"
        fullWidth
      >
        희망 노선 삭제
      </Button>
    </form>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
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

function formatStopDetail(
  stop: RouteStopOption,
) {
  return [
    stop.stopNumber,
    stop.districtName,
  ]
    .filter(Boolean)
    .join(" · ") || "상세 정보 없음";
}

const inputClassName = [
  "min-h-11 w-full rounded-control",
  "border border-line bg-surface",
  "px-3 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-brand",
].join(" ");
"use client";

import {
  useMemo,
  useState,
} from "react";

import type { RouteStopOption } from "@/components/route-stop-types";
import { RouteStopMap } from "@/components/route-stop-map";

export const minRouteSuggestionStops = 5;

type RouteSuggestionFieldsProps = {
  stops: RouteStopOption[];
  initialStops?: RouteStopOption[];
};

export function RouteSuggestionFields({
  stops,
  initialStops = [],
}: RouteSuggestionFieldsProps) {
  const [search, setSearch] =
    useState("");

  const [
    selectedStops,
    setSelectedStops,
  ] = useState<RouteStopOption[]>(
    initialStops,
  );

  const [dragIndex, setDragIndex] =
    useState<number | null>(null);

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

  function addStop(
    stop: RouteStopOption,
  ) {
    setSelectedStops(
      (currentStops) => {
        if (
          currentStops.some(
            (currentStop) =>
              currentStop.id ===
              stop.id,
          )
        ) {
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

  function undoLastStop() {
    setSelectedStops(
      (currentStops) =>
        currentStops.slice(0, -1),
    );
  }

  function reorderStops(
    fromIndex: number,
    toIndex: number,
  ) {
    setSelectedStops(
      (currentStops) => {
        const nextStops = [
          ...currentStops,
        ];

        const [moved] =
          nextStops.splice(
            fromIndex,
            1,
          );

        nextStops.splice(
          toIndex,
          0,
          moved,
        );

        return nextStops;
      },
    );
  }

  return (
    <div className="space-y-4 rounded-card border border-line bg-surface-muted p-4">
      <div>
        <label
          htmlFor="route-suggestion-stop-search"
          className="text-sm font-semibold text-main"
        >
          정류장 검색
        </label>

        <p className="mt-1 text-xs text-muted">
          이동 순서대로 정류장을 최소{" "}
          {minRouteSuggestionStops}개
          선택해 주세요.
        </p>

        <input
          id="route-suggestion-stop-search"
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
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-control border border-line bg-surface">
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
          filteredStops.length ===
            0 && (
            <p className="mt-2 text-xs text-muted">
              선택할 수 있는 정류장이
              없습니다.
            </p>
          )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-main">
            선택한 정류장{" "}
            <span className="font-normal text-muted">
              (드래그로 순서 변경)
            </span>
          </h3>

          <div className="flex items-center gap-3">
            <span
              className={[
                "text-xs font-semibold",
                selectedStops.length >=
                minRouteSuggestionStops
                  ? "text-success"
                  : "text-brand-text",
              ].join(" ")}
            >
              {selectedStops.length}개
            </span>

            {selectedStops.length >
              0 && (
              <button
                type="button"
                onClick={
                  undoLastStop
                }
                className="text-xs font-semibold text-danger"
              >
                마지막 핀 취소
              </button>
            )}
          </div>
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
                <li
                  key={stop.id}
                  draggable
                  onDragStart={() =>
                    setDragIndex(
                      index,
                    )
                  }
                  onDragOver={(
                    event,
                  ) =>
                    event.preventDefault()
                  }
                  onDrop={() => {
                    if (
                      dragIndex !==
                        null &&
                      dragIndex !==
                        index
                    ) {
                      reorderStops(
                        dragIndex,
                        index,
                      );
                    }

                    setDragIndex(
                      null,
                    );
                  }}
                  onDragEnd={() =>
                    setDragIndex(null)
                  }
                  className="flex cursor-grab items-center gap-3 rounded-control bg-surface p-3 active:cursor-grabbing"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand text-xs font-bold text-on-brand">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-main">
                      {stop.name}
                    </strong>

                    <span className="mt-1 block truncate text-xs text-muted">
                      {formatStopDetail(
                        stop,
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeStop(
                        stop.id,
                      )
                    }
                    aria-label={`${stop.name} 삭제`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-control text-sm font-bold text-danger active:bg-danger-soft"
                  >
                    ×
                  </button>

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

        {selectedStops.length > 0 &&
          selectedStops.length <
            minRouteSuggestionStops && (
            <p className="mt-2 text-xs text-warning">
              정류장을{" "}
              {minRouteSuggestionStops -
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
              showPolyline
            />
          </div>
        )}
      </div>
    </div>
  );
}

function formatStopDetail(
  stop: RouteStopOption,
) {
  return (
    [
      stop.stopNumber,
      stop.districtName,
    ]
      .filter(Boolean)
      .join(" · ") ||
    "상세 정보 없음"
  );
}

const inputClassName = [
  "min-h-11 w-full rounded-control",
  "border border-line bg-surface",
  "px-3 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-brand",
].join(" ");

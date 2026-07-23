"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { RouteStopMap } from "@/components/route-stop-map";
import type { RouteStopOption } from "@/components/route-stop-types";

export const requiredRouteSuggestionStops = 5;

type RouteSuggestionFieldsProps = {
  /*
   * 기존 PostForm 및 PostManageModal과의 호환성을 위해
   * stops 속성은 유지합니다.
   *
   * 실제 검색은 이 배열을 사용하지 않고
   * /api/route-stops 공공데이터 API를 사용합니다.
   */
  stops?: RouteStopOption[];
  initialStops?: RouteStopOption[];
  onSelectedCountChange?: (
    count: number,
  ) => void;
};

type StopSearchResponse = {
  stops?: RouteStopOption[];
  message?: string;
};

export function RouteSuggestionFields({
  initialStops = [],
  onSelectedCountChange,
}: RouteSuggestionFieldsProps) {
  const searchInputRef =
    useRef<HTMLInputElement>(null);

  const [search, setSearch] =
    useState("");

  const [
    searchResults,
    setSearchResults,
  ] = useState<RouteStopOption[]>([]);

  const [
    selectedStops,
    setSelectedStops,
  ] = useState<RouteStopOption[]>(
    initialStops.slice(
      0,
      requiredRouteSuggestionStops,
    ),
  );

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  const [
    searchMessage,
    setSearchMessage,
  ] = useState("");

  const selectionComplete =
    selectedStops.length ===
    requiredRouteSuggestionStops;

  useEffect(() => {
    onSelectedCountChange?.(
      selectedStops.length,
    );
  }, [
    selectedStops.length,
    onSelectedCountChange,
  ]);

  async function searchStops() {
    const keyword = search.trim();

    if (keyword.length < 2) {
      setSearchResults([]);
      setSearchMessage(
        "정류장명 또는 정류장 번호를 2자 이상 입력해 주세요.",
      );

      searchInputRef.current?.focus();
      return;
    }

    if (selectionComplete) {
      setSearchResults([]);
      setSearchMessage(
        "정류장은 최대 5개까지 선택할 수 있습니다.",
      );
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSearchMessage("");

    try {
      const params =
        new URLSearchParams({
          query: keyword,
        });

      const response = await fetch(
        `/api/route-stops?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const responseText =
        await response.text();

      let result: StopSearchResponse;

      try {
        result = JSON.parse(
          responseText,
        ) as StopSearchResponse;
      } catch {
        throw new Error(
          "정류장 검색 서버가 올바른 응답을 반환하지 않았습니다.",
        );
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            "정류장을 검색하지 못했습니다.",
        );
      }

      const selectedStopIds =
        new Set(
          selectedStops.map(
            (stop) => stop.id,
          ),
        );

      const availableStops = (
        result.stops ?? []
      ).filter(
        (stop) =>
          !selectedStopIds.has(stop.id),
      );

      setSearchResults(
        availableStops,
      );

      if (availableStops.length === 0) {
        setSearchMessage(
          `"${keyword}"에 해당하는 정류장을 찾지 못했습니다.`,
        );
      }
    } catch (error) {
      setSearchResults([]);

      setSearchMessage(
        error instanceof Error
          ? error.message
          : "정류장을 검색하지 못했습니다.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function addStop(
    stop: RouteStopOption,
  ) {
    setSelectedStops(
      (currentStops) => {
        if (
          currentStops.length >=
          requiredRouteSuggestionStops
        ) {
          return currentStops;
        }

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
    setSearchResults([]);
    setSearchMessage("");

    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }

  function removeStop(
    stopId: number,
  ) {
    setSelectedStops(
      (currentStops) =>
        currentStops.filter(
          (stop) =>
            stop.id !== stopId,
        ),
    );

    setSearchResults([]);
    setSearchMessage("");
  }

  function moveStop(
    currentIndex: number,
    direction: "up" | "down",
  ) {
    setSelectedStops(
      (currentStops) => {
        const nextIndex =
          direction === "up"
            ? currentIndex - 1
            : currentIndex + 1;

        if (
          nextIndex < 0 ||
          nextIndex >=
            currentStops.length
        ) {
          return currentStops;
        }

        const nextStops = [
          ...currentStops,
        ];

        const [movedStop] =
          nextStops.splice(
            currentIndex,
            1,
          );

        nextStops.splice(
          nextIndex,
          0,
          movedStop,
        );

        return nextStops;
      },
    );
  }

  function handleSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void searchStops();
  }

  return (
    <section className="space-y-5 rounded-card border border-line bg-surface-muted p-4">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label
              htmlFor="route-suggestion-stop-search"
              className="text-sm font-semibold text-main"
            >
              정류장 검색
            </label>

            <p className="mt-1 text-xs leading-5 text-muted">
              정류장명이나 정류장 번호로 전국
              버스정류장을 검색할 수 있습니다.
            </p>
          </div>

          <strong
            className={[
              "text-sm",
              selectionComplete
                ? "text-success"
                : "text-warning",
            ].join(" ")}
          >
            {selectedStops.length}/
            {requiredRouteSuggestionStops}
          </strong>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            ref={searchInputRef}
            id="route-suggestion-stop-search"
            value={search}
            disabled={selectionComplete}
            onChange={(event) => {
              setSearch(
                event.target.value,
              );

              setSearchResults([]);
              setSearchMessage("");
            }}
            onKeyDown={
              handleSearchKeyDown
            }
            placeholder={
              selectionComplete
                ? "다른 정류장을 검색하려면 기존 정류장 1개를 삭제해 주세요."
                : "정류장명 또는 정류장 번호"
            }
            className={`${inputClassName} disabled:cursor-not-allowed disabled:bg-surface-muted`}
          />

          <button
            type="button"
            onClick={() =>
              void searchStops()
            }
            disabled={
              isSearching ||
              selectionComplete
            }
            className="min-h-11 shrink-0 rounded-control bg-brand px-5 text-sm font-bold text-on-brand transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSearching
              ? "검색 중..."
              : "검색"}
          </button>
        </div>

        {searchMessage && (
          <p
            role="status"
            className="mt-2 text-xs leading-5 text-danger"
          >
            {searchMessage}
          </p>
        )}

        {searchResults.length > 0 && (
          <ul className="mt-3 max-h-60 overflow-y-auto rounded-control border border-line bg-surface shadow-card">
            {searchResults.map(
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
                    className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-surface-muted"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-main">
                        {stop.name}
                      </strong>

                      <span className="mt-1 block truncate text-xs text-muted">
                        {stop.districtName ||
                          "지역 정보 없음"}
                      </span>
                    </div>

                    <span className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-semibold text-secondary">
                      {stop.stopNumber ||
                        "번호 없음"}
                    </span>
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-main">
              선택한 정류장
            </h3>

            <p className="mt-1 text-xs text-muted">
              화살표 버튼으로 이동 순서를
              변경할 수 있습니다.
            </p>
          </div>

          {!selectionComplete && (
            <span className="text-xs font-semibold text-warning">
              정확히 5개를 선택해 주세요.
            </span>
          )}
        </div>

        {selectedStops.length === 0 ? (
          <div className="mt-3 rounded-control border border-dashed border-line p-6 text-center">
            <p className="text-sm text-muted">
              아직 선택한 정류장이 없습니다.
            </p>
          </div>
        ) : (
          <ol className="mt-3 space-y-2">
            {selectedStops.map(
              (stop, index) => (
                <li
                  key={stop.id}
                  className="flex min-h-16 items-center gap-3 rounded-control border border-line-light bg-surface p-3"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-brand">
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

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        moveStop(
                          index,
                          "up",
                        )
                      }
                      disabled={index === 0}
                      aria-label={`${stop.name} 위로 이동`}
                      title="위로 이동"
                      className={orderButtonClassName}
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moveStop(
                          index,
                          "down",
                        )
                      }
                      disabled={
                        index ===
                        selectedStops.length -
                          1
                      }
                      aria-label={`${stop.name} 아래로 이동`}
                      title="아래로 이동"
                      className={orderButtonClassName}
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        removeStop(
                          stop.id,
                        )
                      }
                      aria-label={`${stop.name} 선택 취소`}
                      title="선택 취소"
                      className="flex size-8 items-center justify-center rounded-control border border-danger/30 text-sm font-bold text-danger transition hover:bg-danger-soft"
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

        {!selectionComplete && (
          <p className="mt-3 rounded-control bg-warning-soft p-3 text-xs font-semibold text-warning">
            정류장 5개를 선택해야 수정 내용을
            저장할 수 있습니다.
          </p>
        )}

        {selectedStops.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-control border border-line bg-surface">
            <RouteStopMap
              stopIds={selectedStops.map(
                (stop) => stop.id,
              )}
              showPolyline
            />
          </div>
        )}
      </div>
    </section>
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

const orderButtonClassName = [
  "flex size-8 items-center justify-center",
  "rounded-control border border-line",
  "text-sm font-bold text-secondary",
  "transition hover:bg-surface-muted",
  "disabled:cursor-not-allowed",
  "disabled:opacity-30",
].join(" ");
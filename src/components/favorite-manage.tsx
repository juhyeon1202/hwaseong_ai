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
  deleteFavorite,
  favoriteInitialState,
} from "@/app/(protected)/favorites/actions";
import {
  Button,
  Card,
  SectionHeader,
} from "@/components/ui";

export type KakaoPlaceOption = {
  id: string;
  name: string;
  address: string;
  longitude: number;
  latitude: number;
};

export type FavoriteRouteStep = {
  type:
    | "BUS"
    | "SUBWAY"
    | "WALKING";
  guidance: string;
  distance: number;
  time: number;
  vehicles: string[];
};

export type FavoriteRouteOption = {
  id: number;
  type: string;
  totalDistance: number;
  totalTime: number;
  transfers: number;
  fare: number | null;
  steps: FavoriteRouteStep[];
};

type PlaceSearchResponse = {
  places?: KakaoPlaceOption[];
  message?: string;
};

type RouteSearchResponse = {
  status?: string;
  routes?: FavoriteRouteOption[];
  landingUrl?: string | null;
  message?: string;
};

export function FavoriteForm() {
  const [
    favoriteType,
    setFavoriteType,
  ] = useState<
    "place" | "route"
  >("place");

  const [
    label,
    setLabel,
  ] = useState("");

  const [
    selectedPlace,
    setSelectedPlace,
  ] =
    useState<KakaoPlaceOption | null>(
      null,
    );

  const [
    startPlace,
    setStartPlace,
  ] =
    useState<KakaoPlaceOption | null>(
      null,
    );

  const [
    endPlace,
    setEndPlace,
  ] =
    useState<KakaoPlaceOption | null>(
      null,
    );

  const [
    routes,
    setRoutes,
  ] = useState<
    FavoriteRouteOption[]
  >([]);

  const [
    selectedRoute,
    setSelectedRoute,
  ] =
    useState<FavoriteRouteOption | null>(
      null,
    );

  const [
    routeError,
    setRouteError,
  ] = useState("");

  const [
    isSearchingRoutes,
    setIsSearchingRoutes,
  ] = useState(false);

  const formRef =
    useRef<HTMLFormElement>(null);

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createFavorite,
    favoriteInitialState,
  );

  useEffect(() => {
    if (
      state.status !== "success"
    ) {
      return;
    }

    formRef.current?.reset();

    setLabel("");
    setSelectedPlace(null);
    setStartPlace(null);
    setEndPlace(null);
    setRoutes([]);
    setSelectedRoute(null);
    setRouteError("");
  }, [state.status]);

  function changeFavoriteType(
    type: "place" | "route",
  ) {
    setFavoriteType(type);
    setLabel("");
    setSelectedPlace(null);
    setStartPlace(null);
    setEndPlace(null);
    setRoutes([]);
    setSelectedRoute(null);
    setRouteError("");
  }

  async function searchRoutes() {
    if (
      !startPlace ||
      !endPlace
    ) {
      setRouteError(
        "출발지와 도착지를 모두 선택해 주세요.",
      );

      return;
    }

    if (
      startPlace.latitude ===
        endPlace.latitude &&
      startPlace.longitude ===
        endPlace.longitude
    ) {
      setRouteError(
        "출발지와 도착지가 같습니다.",
      );

      return;
    }

    setIsSearchingRoutes(true);
    setRouteError("");
    setRoutes([]);
    setSelectedRoute(null);

    try {
      const params =
        new URLSearchParams({
          mode: "routes",
          startX: String(
            startPlace.longitude,
          ),
          startY: String(
            startPlace.latitude,
          ),
          endX: String(
            endPlace.longitude,
          ),
          endY: String(
            endPlace.latitude,
          ),
          startName:
            startPlace.name,
          endName:
            endPlace.name,
        });

      const response =
        await fetch(
          `/api/kakao?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

      const result =
        (await response.json()) as RouteSearchResponse;

      if (!response.ok) {
        throw new Error(
          result.message ||
            "추천 경로를 찾지 못했습니다.",
        );
      }

      const nextRoutes =
        result.routes ?? [];

      setRoutes(nextRoutes);

      if (
        nextRoutes.length === 0
      ) {
        setRouteError(
          "이동 가능한 대중교통 경로를 찾지 못했습니다.",
        );
      }
    } catch (error) {
      setRouteError(
        error instanceof Error
          ? error.message
          : "추천 경로를 찾지 못했습니다.",
      );
    } finally {
      setIsSearchingRoutes(false);
    }
  }

  const payload =
    favoriteType === "place"
      ? selectedPlace
        ? {
            type: "place",
            kakaoPlaceId:
              selectedPlace.id,
            placeName:
              selectedPlace.name,
            address:
              selectedPlace.address,
            latitude:
              selectedPlace.latitude,
            longitude:
              selectedPlace.longitude,
          }
        : null
      : startPlace &&
          endPlace &&
          selectedRoute
        ? {
            type: "route",
            startPlace,
            endPlace,
            route:
              selectedRoute,
          }
        : null;

  const canSubmit =
    label.trim().length > 0 &&
    payload !== null &&
    !isPending;

  return (
    <Card>
      <SectionHeader
        title="즐겨찾기 추가"
        description="장소 또는 자주 이용할 대중교통 경로를 저장해 보세요."
      />

      <form
        ref={formRef}
        action={formAction}
        className="mt-5 space-y-5"
      >
        <input
          type="hidden"
          name="favoriteType"
          value={favoriteType}
        />

        <input
          type="hidden"
          name="payload"
          value={
            payload
              ? JSON.stringify(
                  payload,
                )
              : ""
          }
        />

        <div>
          <span className="mb-2 block text-sm font-bold text-main">
            즐겨찾기 유형
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                changeFavoriteType(
                  "place",
                )
              }
              className={typeButtonClassName(
                favoriteType ===
                  "place",
              )}
            >
              장소
            </button>

            <button
              type="button"
              onClick={() =>
                changeFavoriteType(
                  "route",
                )
              }
              className={typeButtonClassName(
                favoriteType ===
                  "route",
              )}
            >
              노선
            </button>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-main">
            즐겨찾기 이름
          </span>

          <input
            name="label"
            value={label}
            onChange={(event) =>
              setLabel(
                event.target.value,
              )
            }
            required
            maxLength={100}
            placeholder={
              favoriteType === "place"
                ? "예: 학교"
                : "예: 등교 경로"
            }
            className={inputClassName}
          />
        </label>

        {favoriteType ===
          "place" && (
          <PlaceSearchField
            label="장소 검색"
            placeholder="예: 한신대"
            selectedPlace={
              selectedPlace
            }
            onSelect={
              setSelectedPlace
            }
          />
        )}

        {favoriteType ===
          "route" && (
          <div className="space-y-5">
            <PlaceSearchField
              label="출발지"
              placeholder="출발지를 검색해 주세요."
              selectedPlace={
                startPlace
              }
              onSelect={(place) => {
                setStartPlace(place);
                setRoutes([]);
                setSelectedRoute(null);
              }}
            />

            <PlaceSearchField
              label="도착지"
              placeholder="도착지를 검색해 주세요."
              selectedPlace={
                endPlace
              }
              onSelect={(place) => {
                setEndPlace(place);
                setRoutes([]);
                setSelectedRoute(null);
              }}
            />

            <button
              type="button"
              onClick={() =>
                void searchRoutes()
              }
              disabled={
                isSearchingRoutes ||
                !startPlace ||
                !endPlace
              }
              className="min-h-12 w-full rounded-control bg-[#5470e8] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSearchingRoutes
                ? "경로 검색 중..."
                : "추천 경로 찾기"}
            </button>

            {routeError && (
              <p
                role="status"
                className="rounded-control bg-danger-soft p-3 text-sm text-danger"
              >
                {routeError}
              </p>
            )}

            {routes.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-main">
                  추천 경로
                </h3>

                <p className="mt-1 text-xs text-muted">
                  저장할 경로를 하나
                  선택해 주세요.
                </p>

                <ul className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {routes.map(
                    (route) => (
                      <RouteOptionCard
                        key={route.id}
                        route={route}
                        selected={
                          selectedRoute
                            ?.id ===
                          route.id
                        }
                        onSelect={() =>
                          setSelectedRoute(
                            route,
                          )
                        }
                      />
                    ),
                  )}
                </ul>
              </section>
            )}
          </div>
        )}

        {state.message && (
          <p
            role="status"
            className={[
              "rounded-control p-3 text-sm",
              state.status ===
              "success"
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
          disabled={!canSubmit}
        >
          {isPending
            ? "저장 중..."
            : "즐겨찾기 추가"}
        </Button>
      </form>
    </Card>
  );
}

function PlaceSearchField({
  label,
  placeholder,
  selectedPlace,
  onSelect,
}: {
  label: string;
  placeholder: string;
  selectedPlace:
    | KakaoPlaceOption
    | null;
  onSelect: (
    place: KakaoPlaceOption,
  ) => void;
}) {
  const [
    query,
    setQuery,
  ] = useState("");

  const [
    results,
    setResults,
  ] = useState<
    KakaoPlaceOption[]
  >([]);

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function searchPlaces() {
    const keyword =
      query.trim();

    if (keyword.length < 2) {
      setError(
        "검색어를 2자 이상 입력해 주세요.",
      );

      return;
    }

    setIsSearching(true);
    setError("");
    setResults([]);

    try {
      const params =
        new URLSearchParams({
          mode: "places",
          query: keyword,
        });

      const response =
        await fetch(
          `/api/kakao?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

      const result =
        (await response.json()) as PlaceSearchResponse;

      if (!response.ok) {
        throw new Error(
          result.message ||
            "장소를 검색하지 못했습니다.",
        );
      }

      const places =
        result.places ?? [];

      setResults(places);

      if (places.length === 0) {
        setError(
          `"${keyword}"에 해당하는 장소가 없습니다.`,
        );
      }
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "장소를 검색하지 못했습니다.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section>
      <span className="mb-2 block text-sm font-bold text-main">
        {label}
      </span>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => {
            setQuery(
              event.target.value,
            );

            setResults([]);
            setError("");
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter"
            ) {
              event.preventDefault();

              void searchPlaces();
            }
          }}
          placeholder={placeholder}
          className={inputClassName}
        />

        <button
          type="button"
          onClick={() =>
            void searchPlaces()
          }
          disabled={isSearching}
          className="min-h-11 shrink-0 rounded-control border border-[#5470e8] px-4 text-sm font-bold text-[#4d68d7] disabled:opacity-50"
        >
          {isSearching
            ? "검색 중"
            : "검색"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 max-h-60 overflow-y-auto rounded-control border border-line bg-white shadow-card">
          {results.map(
            (place) => (
              <li
                key={place.id}
                className="border-b border-line-light last:border-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(place);
                    setQuery(
                      place.name,
                    );
                    setResults([]);
                    setError("");
                  }}
                  className="w-full px-4 py-3 text-left transition hover:bg-surface-muted"
                >
                  <strong className="block text-sm text-main">
                    {place.name}
                  </strong>

                  <span className="mt-1 block text-xs text-muted">
                    {place.address}
                  </span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {selectedPlace && (
        <div className="mt-3 rounded-control border border-[#aebcf7] bg-[#edf2ff] p-3">
          <strong className="block text-sm text-main">
            {selectedPlace.name}
          </strong>

          <span className="mt-1 block text-xs text-muted">
            {selectedPlace.address}
          </span>
        </div>
      )}
    </section>
  );
}

function RouteOptionCard({
  route,
  selected,
  onSelect,
}: {
  route: FavoriteRouteOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={[
          "w-full rounded-[14px] border bg-white p-4 text-left transition",
          selected
            ? "border-[#d87525] ring-2 ring-[#d87525]/10"
            : "border-line hover:border-[#5470e8]",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <strong className="text-xl text-main">
              {formatMinutes(
                route.totalTime,
              )}
            </strong>

            <p className="mt-1 text-xs font-bold text-[#d87525]">
              {selected
                ? "선택한 경로"
                : "이 경로 선택"}
            </p>
          </div>

          <span className="text-sm text-muted">
            환승 {route.transfers}회
          </span>
        </div>

        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#e5e7eb]">
          {route.steps.map(
            (step, index) => (
              <span
                key={`${step.type}-${index}`}
                className={
                  step.type === "BUS"
                    ? "bg-[#72a482]"
                    : step.type ===
                        "SUBWAY"
                      ? "bg-[#6174df]"
                      : "bg-[#c9ced6]"
                }
                style={{
                  flex: Math.max(
                    step.time,
                    1,
                  ),
                }}
              />
            ),
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {route.steps.map(
            (step, index) => (
              <span
                key={`${step.guidance}-${index}`}
                className={
                  step.type === "BUS"
                    ? "text-[#4f8b62]"
                    : step.type ===
                        "SUBWAY"
                      ? "text-[#5268db]"
                      : "text-muted"
                }
              >
                {formatStep(step)}
              </span>
            ),
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
          <span>
            총 거리{" "}
            {formatDistance(
              route.totalDistance,
            )}
          </span>

          {route.fare !== null && (
            <span>
              요금{" "}
              {route.fare.toLocaleString(
                "ko-KR",
              )}
              원
            </span>
          )}
        </div>
      </button>
    </li>
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

function typeButtonClassName(
  selected: boolean,
) {
  return [
    "min-h-11 rounded-control border px-4 text-sm font-bold transition",
    selected
      ? "border-[#5470e8] bg-[#5470e8] text-white"
      : "border-line bg-white text-secondary",
  ].join(" ");
}

function formatStep(
  step: FavoriteRouteStep,
) {
  const minutes =
    formatMinutes(step.time);

  if (
    step.vehicles.length > 0
  ) {
    return `${step.vehicles.join(
      " · ",
    )} ${minutes}`;
  }

  if (step.type === "WALKING") {
    return `도보 ${minutes}`;
  }

  return `${step.guidance} ${minutes}`;
}

function formatMinutes(
  seconds: number,
) {
  return `${Math.max(
    1,
    Math.round(seconds / 60),
  )}분`;
}

function formatDistance(
  meters: number,
) {
  if (meters >= 1000) {
    return `${(
      meters / 1000
    ).toFixed(1)}km`;
  }

  return `${Math.round(
    meters,
  )}m`;
}

const inputClassName = [
  "min-h-11 w-full rounded-control",
  "border border-line bg-white",
  "px-3 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-[#5470e8]",
  "focus:ring-2 focus:ring-[#5470e8]/10",
].join(" ");
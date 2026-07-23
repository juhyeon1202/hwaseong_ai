"use client";

import {
  FormEvent,
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  createJournal,
  type JournalActionState,
} from "@/app/(protected)/journal/actions";

import {
  Badge,
  Button,
  Card,
  EmptyState,
} from "@/components/ui";

type Place = {
  id: string;
  name: string;
  address: string;
  longitude: number;
  latitude: number;
};

type TransitStep = {
  type:
    | "BUS"
    | "SUBWAY"
    | "WALKING";
  guidance: string;
  distance: number;
  time: number;
  vehicles: string[];
};

type TransitRoute = {
  id: number;
  type:
    | "BUS"
    | "SUBWAY"
    | "BUS_AND_SUBWAY";
  totalDistance: number;
  totalTime: number;
  transfers: number;
  fare: number | null;
  steps: TransitStep[];
};

type RouteResponse = {
  status: string;
  landingUrl: string | null;
  routes: TransitRoute[];
  message?: string;
};

type SegmentReview = {
  sentiment:
    | "satisfied"
    | "dissatisfied";
  reasonCodes: string[];
  memo: string;
};

type RouteSort =
  | "recommended"
  | "time"
  | "transfers"
  | "walking";

type JournalRouteFormProps = {
  initialCategory?: string;
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
  },
  {
    value: "return",
    label: "퇴근",
    description: "회사 → 집",
  },
  {
    value: "school",
    label: "등하교",
    description: "집 ↔ 학교",
  },
  {
    value: "other",
    label: "기타 이동",
    description: "직접 선택",
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
    value: "long_wait",
    label: "긴 대기시간",
  },
  {
    value: "facility",
    label: "시설 불편",
  },
] as const;

export function JournalRouteForm({
  initialCategory = "commute",
}: JournalRouteFormProps) {
  const [category, setCategory] =
    useState(initialCategory);

  const [startPlace, setStartPlace] =
    useState<Place | null>(null);

  const [endPlace, setEndPlace] =
    useState<Place | null>(null);

  const [routes, setRoutes] =
    useState<TransitRoute[]>([]);

  const [routeSort, setRouteSort] =
    useState<RouteSort>("recommended");

  const [
    selectedRouteId,
    setSelectedRouteId,
  ] = useState<number | null>(null);

  const [reviews, setReviews] =
    useState<SegmentReview[]>([]);

  const [isSearching, setIsSearching] =
    useState(false);

  const [searchError, setSearchError] =
    useState("");

  const [state, formAction, isPending] =
    useActionState(
      createJournal,
      initialState,
    );

  const sortedRoutes = useMemo(() => {
    const indexedRoutes = routes.map(
      (route, originalIndex) => ({
        route,
        originalIndex,
      }),
    );

    return indexedRoutes
      .sort((first, second) => {
        if (routeSort === "time") {
          return (
            first.route.totalTime -
            second.route.totalTime
          );
        }

        if (routeSort === "transfers") {
          return (
            first.route.transfers -
              second.route.transfers ||
            first.route.totalTime -
              second.route.totalTime
          );
        }

        if (routeSort === "walking") {
          return (
            getWalkingSeconds(
              first.route,
            ) -
              getWalkingSeconds(
                second.route,
              ) ||
            first.route.totalTime -
              second.route.totalTime
          );
        }

        return (
          first.originalIndex -
          second.originalIndex
        );
      })
      .map((item) => item.route);
  }, [routeSort, routes]);

  const selectedRoute =
    routes.find(
      (route) =>
        route.id === selectedRouteId,
    ) ?? null;

  const reviewableSteps = useMemo(
    () =>
      selectedRoute?.steps.filter(
        (step) =>
          step.time > 0 &&
          Number.isFinite(step.time),
      ) ?? [],
    [selectedRoute],
  );

  const segmentsPayload =
    selectedRoute &&
    startPlace &&
    endPlace
      ? reviewableSteps.map(
          (step, index) => ({
            segmentOrder: index + 1,
            mode: getSegmentMode(
              step.type,
            ),
            routeNumber:
              step.vehicles.join(", "),
            durationMinutes:
              secondsToMinutes(
                step.time,
              ),
            originLabel:
              index === 0
                ? startPlace.name
                : reviewableSteps[
                    index - 1
                  ]?.guidance ||
                  startPlace.name,
            destinationLabel:
              index ===
              reviewableSteps.length - 1
                ? endPlace.name
                : reviewableSteps[
                    index + 1
                  ]?.guidance ||
                  endPlace.name,
            sentiment:
              reviews[index]
                ?.sentiment ??
              "satisfied",
            reasonCodes:
              reviews[index]
                ?.reasonCodes ?? [],
            memo:
              reviews[index]?.memo ??
              "",
            guidance: step.guidance,
            distance: step.distance,
          }),
        )
      : [];

  function resetRoutes() {
    setRoutes([]);
    setSelectedRouteId(null);
    setReviews([]);
    setRouteSort("recommended");
    setSearchError("");
  }

  function changeStartPlace(place: Place) {
    setStartPlace(place);
    resetRoutes();
  }

  function changeEndPlace(place: Place) {
    setEndPlace(place);
    resetRoutes();
  }

  function swapPlaces() {
    setStartPlace(endPlace);
    setEndPlace(startPlace);
    resetRoutes();
  }

  async function findRoutes() {
    if (!startPlace || !endPlace) {
      setSearchError(
        "출발지와 도착지를 모두 선택해 주세요.",
      );
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setRoutes([]);
    setSelectedRouteId(null);
    setReviews([]);
    setRouteSort("recommended");

    try {
      const params =
        new URLSearchParams({
          mode: "routes",
          startX:
            startPlace.longitude.toString(),
          startY:
            startPlace.latitude.toString(),
          endX:
            endPlace.longitude.toString(),
          endY:
            endPlace.latitude.toString(),
          startName: startPlace.name,
          endName: endPlace.name,
        });

      const response = await fetch(
        `/api/kakao?${params.toString()}`,
      );

      const result =
        await readJsonResponse<RouteResponse>(
          response,
        );

      if (!response.ok) {
        throw new Error(
          result.message ??
            "경로 검색에 실패했습니다.",
        );
      }

      if (result.routes.length === 0) {
        setSearchError(
          getRouteStatusMessage(
            result.status,
          ),
        );
        return;
      }

      setRoutes(result.routes);
      selectRoute(result.routes[0]);
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "경로 검색에 실패했습니다.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function selectRoute(
    route: TransitRoute,
  ) {
    setSelectedRouteId(route.id);

    setReviews(
      route.steps
        .filter(
          (step) =>
            step.time > 0 &&
            Number.isFinite(
              step.time,
            ),
        )
        .map(() => ({
          sentiment: "satisfied",
          reasonCodes: [],
          memo: "",
        })),
    );
  }

  function updateReview(
    index: number,
    next: Partial<SegmentReview>,
  ) {
    setReviews((current) =>
      current.map(
        (review, reviewIndex) =>
          reviewIndex === index
            ? {
                ...review,
                ...next,
              }
            : review,
      ),
    );
  }

  function toggleReason(
    index: number,
    reason: string,
  ) {
    const review = reviews[index];

    if (!review) {
      return;
    }

    const reasonCodes =
      review.reasonCodes.includes(reason)
        ? review.reasonCodes.filter(
            (value) =>
              value !== reason,
          )
        : [
            ...review.reasonCodes,
            reason,
          ];

    updateReview(index, {
      reasonCodes,
    });
  }

  return (
    <div
      className={[
        "grid gap-6 lg:items-stretch",
        "lg:grid-cols-[380px_minmax(0,1fr)]",
      ].join(" ")}
    >
      <Card
        className={[
          "flex flex-col",
          "lg:row-span-2",
          "lg:mt-[150px]",
          "lg:h-[calc(100%-150px)]",
        ].join(" ")}
      >
        <header className="border-b border-line-light pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-brand">
                오늘의 일지
              </p>

              <h1 className="mt-1 text-xl font-bold text-main">
                교통일지 기록
              </h1>
            </div>

            <span className="rounded-pill bg-brand-softer px-3 py-1.5 text-xs font-semibold text-brand">
              자동 기록
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-muted">
            경로를 찾고 실제 이용한 경로의 각 구간을 평가해 주세요.
            오늘의 이동 경험이 더 나은 화성시 교통을 만드는 데이터가 됩니다.
          </p>

          <div className="mt-5 rounded-card bg-surface-muted p-4">
            <p className="text-xs font-semibold text-secondary">
              교통일지 작성 순서
            </p>

            <ol className="mt-3 grid grid-cols-3 gap-2">
              <li className="rounded-control bg-white px-2 py-3 text-center">
                <span className="block text-[11px] font-bold text-brand">
                  01
                </span>
                <span className="mt-1 block text-xs font-semibold text-main">
                  이동 유형
                </span>
              </li>

              <li className="rounded-control bg-white px-2 py-3 text-center">
                <span className="block text-[11px] font-bold text-info">
                  02
                </span>
                <span className="mt-1 block text-xs font-semibold text-main">
                  경로 선택
                </span>
              </li>

              <li className="rounded-control bg-white px-2 py-3 text-center">
                <span className="block text-[11px] font-bold text-success">
                  03
                </span>
                <span className="mt-1 block text-xs font-semibold text-main">
                  구간 평가
                </span>
              </li>
            </ol>

            <p className="mt-3 text-center text-[11px] leading-5 text-muted">
              날짜와 작성 시간은 저장할 때 자동으로 기록됩니다.
            </p>
          </div>
        </header>

        <fieldset className="mt-6">
          <legend className="text-base font-bold text-main">
            어떤 이동인가요?
          </legend>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {categories.map((item) => (
              <label
                key={item.value}
                className="cursor-pointer"
              >
                <input
                  type="radio"
                  name="category-preview"
                  value={item.value}
                  checked={
                    category === item.value
                  }
                  onChange={() =>
                    setCategory(
                      item.value,
                    )
                  }
                  className="peer sr-only"
                />

                <span
                  className={[
                    "flex min-h-[86px] flex-col",
                    "items-center justify-center",
                    "rounded-card border border-line",
                    "bg-white p-3 text-center",
                    "peer-checked:border-brand",
                    "peer-checked:bg-brand-softer",
                  ].join(" ")}
                >
                  <strong className="text-sm text-main peer-checked:text-brand-text">
                    {item.label}
                  </strong>

                  <span className="mt-1 text-[11px] text-muted">
                    {item.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <section className="mt-8 flex flex-1 flex-col justify-center">
          <h2 className="text-base font-bold text-main">
            출발지와 도착지
          </h2>

          <div className="mt-4 space-y-4">
            <PlaceSearch
              label="출발지"
              placeholder="예: 병점역"
              selectedPlace={startPlace}
              onSelect={
                changeStartPlace
              }
              allowCurrentLocation
            />

            <div className="flex justify-center">
              <button
                type="button"
                onClick={swapPlaces}
                className={[
                  "inline-flex min-h-10 items-center",
                  "rounded-pill border border-line",
                  "bg-white px-4 text-xs",
                  "font-semibold text-secondary",
                ].join(" ")}
              >
                출발지·도착지 바꾸기
              </button>
            </div>

            <PlaceSearch
              label="도착지"
              placeholder="예: 동탄역"
              selectedPlace={endPlace}
              onSelect={
                changeEndPlace
              }
            />
          </div>

          {searchError && (
            <p
              role="alert"
              className="mt-4 rounded-control bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
            >
              {searchError}
            </p>
          )}

          <Button
            type="button"
            fullWidth
            disabled={
              isSearching ||
              !startPlace ||
              !endPlace
            }
            onClick={() =>
              void findRoutes()
            }
            className="mt-5 min-h-12 bg-info text-base hover:opacity-90"
          >
            {isSearching
              ? "카카오맵 경로 검색 중..."
              : "길찾기"}
          </Button>
        </section>
      </Card>

      {isSearching && (
        <RouteSkeleton />
      )}

      {!isSearching &&
        routes.length === 0 && (
          <EmptyState
            title="이동 경로를 검색해 주세요"
            description="출발지와 도착지를 선택하고 길찾기 버튼을 누르면 이용 가능한 경로가 표시됩니다."
          />
        )}

      {routes.length > 0 && (
        <section>
          <header className="mb-4 border-b border-line-light pb-4">
            <h2 className="text-lg font-bold text-main">
              {startPlace?.name}
              {" → "}
              {endPlace?.name}
            </h2>

            <p className="mt-1 text-sm text-muted">
              {routes.length}개의 대중교통
              경로를 찾았습니다.
            </p>
          </header>

          <div
            role="group"
            aria-label="경로 정렬"
            className="mb-5 flex flex-wrap gap-2"
          >
            <RouteFilterButton
              active={
                routeSort ===
                "recommended"
              }
              onClick={() =>
                setRouteSort(
                  "recommended",
                )
              }
            >
              추천순
            </RouteFilterButton>

            <RouteFilterButton
              active={
                routeSort === "time"
              }
              onClick={() =>
                setRouteSort("time")
              }
            >
              최소시간
            </RouteFilterButton>

            <RouteFilterButton
              active={
                routeSort ===
                "transfers"
              }
              onClick={() =>
                setRouteSort(
                  "transfers",
                )
              }
            >
              최소환승
            </RouteFilterButton>

            <RouteFilterButton
              active={
                routeSort === "walking"
              }
              onClick={() =>
                setRouteSort(
                  "walking",
                )
              }
            >
              최소도보
            </RouteFilterButton>
          </div>

          <div className="-mr-3 max-h-[340px] overflow-y-auto pr-3 scrollbar-thin">
            <div className="space-y-4">
              {sortedRoutes.map((route) => (
                <RouteChoiceCard
                  key={route.id}
                  route={route}
                  recommended={routes[0]?.id === route.id}
                  selected={selectedRouteId === route.id}
                  onSelect={() => selectRoute(route)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {selectedRoute &&
        startPlace &&
        endPlace && (
          <form
            action={formAction}
            className="space-y-5"
          >
            <input
              type="hidden"
              name="category"
              value={category}
            />

            <input
              type="hidden"
              name="originLabel"
              value={startPlace.name}
            />

            <input
              type="hidden"
              name="destinationLabel"
              value={endPlace.name}
            />

            <input
              type="hidden"
              name="durationMinutes"
              value={secondsToMinutes(
                selectedRoute.totalTime,
              )}
            />

            <input
              type="hidden"
              name="routePayload"
              value={JSON.stringify(
                selectedRoute,
              )}
            />

            <input
              type="hidden"
              name="segmentsJson"
              value={JSON.stringify(
                segmentsPayload,
              )}
            />

            <Card>
              <header className="border-b border-line-light pb-4">
                <Badge variant="info">
                  선택한 경로
                </Badge>

                <h2 className="mt-3 text-lg font-bold text-main">
                  {startPlace.name}
                  {" → "}
                  {endPlace.name}
                </h2>

                <p className="mt-2 text-sm text-secondary">
                  총{" "}
                  {secondsToMinutes(
                    selectedRoute.totalTime,
                  )}
                  분 · 환승{" "}
                  {selectedRoute.transfers}
                  회 · 구간{" "}
                  {
                    reviewableSteps.length
                  }
                  개
                </p>
              </header>

              <ol className="mt-5 space-y-4">
                {reviewableSteps.map(
                  (step, index) => (
                    <SegmentReviewCard
                      key={`${selectedRoute.id}-${index}`}
                      index={index}
                      step={step}
                      review={
                        reviews[index]
                      }
                      onChange={
                        updateReview
                      }
                      onToggleReason={
                        toggleReason
                      }
                    />
                  ),
                )}
              </ol>

              {state.message && (
                <p
                  role="status"
                  className={[
                    "mt-5 rounded-control",
                    "px-4 py-3 text-sm leading-6",
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
                disabled={
                  isPending ||
                  segmentsPayload.length ===
                    0
                }
                className="mt-6 min-h-12 text-base"
              >
                {isPending
                  ? "교통일지 저장 중..."
                  : "오늘의 교통일지 저장"}
              </Button>
            </Card>
          </form>
        )}
    </div>
  );
}

type PlaceSearchProps = {
  label: string;
  placeholder: string;
  selectedPlace: Place | null;
  onSelect: (place: Place) => void;
  allowCurrentLocation?: boolean;
};

function PlaceSearch({
  label,
  placeholder,
  selectedPlace,
  onSelect,
  allowCurrentLocation = false,
}: PlaceSearchProps) {
  const [query, setQuery] =
    useState("");

  const [places, setPlaces] =
    useState<Place[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function searchPlaces(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const keyword = query.trim();

    if (keyword.length < 2) {
      setMessage(
        "검색어를 2자 이상 입력해 주세요.",
      );
      return;
    }

    setIsLoading(true);
    setMessage("");
    setPlaces([]);

    try {
      const params =
        new URLSearchParams({
          mode: "places",
          query: keyword,
        });

      const response = await fetch(
        `/api/kakao?${params.toString()}`,
      );

      const result =
        await readJsonResponse<{
          places?: Place[];
          message?: string;
        }>(response);

      if (!response.ok) {
        throw new Error(
          result.message ??
            "장소 검색에 실패했습니다.",
        );
      }

      const nextPlaces =
        result.places ?? [];

      setPlaces(nextPlaces);

      if (nextPlaces.length === 0) {
        setMessage(
          "검색 결과가 없습니다.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "장소 검색에 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function selectPlace(place: Place) {
    onSelect(place);
    setQuery(place.name);
    setPlaces([]);
    setMessage("");
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage(
        "현재 위치를 지원하지 않는 브라우저입니다.",
      );
      return;
    }

    setIsLoading(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectPlace({
          id: "current-location",
          name: "현재 위치",
          address:
            "기기에서 확인한 현재 위치",
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude,
        });

        setIsLoading(false);
      },
      () => {
        setMessage(
          "브라우저의 위치 권한을 허용해 주세요.",
        );
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-main">
          {label}
        </span>

        {allowCurrentLocation && (
          <button
            type="button"
            onClick={useCurrentLocation}
            className="min-h-9 text-xs font-semibold text-info"
          >
            현재 위치 사용
          </button>
        )}
      </div>

      <form
        onSubmit={searchPlaces}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder={placeholder}
          className={[
            "min-h-11 min-w-0 flex-1",
            "rounded-control border border-line",
            "bg-white px-3 text-sm text-main",
            "outline-none placeholder:text-muted",
            "focus:border-info",
          ].join(" ")}
        />

        <Button
          type="submit"
          variant="secondary"
          disabled={isLoading}
          className="shrink-0"
        >
          {isLoading
            ? "검색 중"
            : "검색"}
        </Button>
      </form>

      {selectedPlace && (
        <div className="mt-2 rounded-control border border-info/20 bg-info-soft p-3">
          <p className="text-sm font-semibold text-main">
            {selectedPlace.name}
          </p>

          <p className="mt-1 text-xs text-muted">
            {selectedPlace.address}
          </p>
        </div>
      )}

      {message && (
        <p className="mt-2 text-xs text-danger">
          {message}
        </p>
      )}

      {places.length > 0 && (
        <ul className="mt-2 max-h-64 overflow-y-auto rounded-control border border-line bg-white">
          {places.map((place) => (
            <li
              key={place.id}
              className="border-b border-line-light last:border-b-0"
            >
              <button
                type="button"
                onClick={() =>
                  selectPlace(place)
                }
                className="min-h-14 w-full px-4 py-3 text-left hover:bg-info-soft"
              >
                <strong className="block text-sm text-main">
                  {place.name}
                </strong>

                <span className="mt-1 block text-xs text-muted">
                  {place.address}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type RouteChoiceCardProps = {
  route: TransitRoute;
  recommended: boolean;
  selected: boolean;
  onSelect: () => void;
};

function RouteChoiceCard({
  route,
  recommended,
  selected,
  onSelect,
}: RouteChoiceCardProps) {
  const walkingMinutes =
    secondsToMinutes(
      getWalkingSeconds(route),
    );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full rounded-card border",
        "bg-white p-5 text-left",
        "shadow-card transition-colors",
        selected
          ? "border-brand bg-brand-softer ring-2 ring-brand/10"
          : "border-line hover:border-brand/50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <strong className="block text-2xl font-extrabold leading-none text-main">
            {secondsToMinutes(
              route.totalTime,
            )}
            분
          </strong>

          {recommended && (
            <span className="mt-2 inline-flex text-xs font-bold text-brand">
              추천 경로
            </span>
          )}
        </div>

        <p className="pt-1 text-right text-sm text-muted">
          {route.transfers === 0
            ? "환승 없음"
            : `환승 ${route.transfers}회`}
          {" · "}
          도보 {walkingMinutes}분
        </p>
      </div>

      <RouteSegmentBar route={route} />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted">
          총 거리{" "}
          {formatDistance(
            route.totalDistance,
          )}
          {route.fare !== null &&
            ` · ${route.fare.toLocaleString()}원`}
        </span>

        <span
          className={[
            "text-xs font-bold",
            selected
              ? "text-brand"
              : "text-muted",
          ].join(" ")}
        >
          {selected
            ? "선택된 경로"
            : "이 경로 선택"}
        </span>
      </div>
    </button>
  );
}

function SegmentReviewCard({
  index,
  step,
  review,
  onChange,
  onToggleReason,
}: {
  index: number;
  step: TransitStep;
  review: SegmentReview | undefined;
  onChange: (
    index: number,
    next: Partial<SegmentReview>,
  ) => void;
  onToggleReason: (
    index: number,
    reason: string,
  ) => void;
}) {
  if (!review) {
    return null;
  }

  return (
    <li className="rounded-card border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span
          className={[
            "flex size-9 shrink-0 items-center",
            "justify-center rounded-full",
            "text-xs font-extrabold text-white",
            step.type === "BUS"
              ? "bg-info"
              : step.type === "SUBWAY"
                ? "bg-success"
                : "bg-secondary",
          ].join(" ")}
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-main">
              {getStepVehicleName(
                step,
              )}
            </strong>

            <span className="text-xs text-muted">
              {secondsToMinutes(
                step.time,
              )}
              분 ·{" "}
              {formatDistance(
                step.distance,
              )}
            </span>
          </div>

          <p className="mt-1 text-xs leading-5 text-muted">
            {step.guidance}
          </p>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold text-main">
          이 구간은 어땠나요?
        </legend>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="cursor-pointer">
            <input
              type="radio"
              checked={
                review.sentiment ===
                "satisfied"
              }
              onChange={() =>
                onChange(index, {
                  sentiment:
                    "satisfied",
                  reasonCodes: [],
                  memo: "",
                })
              }
              className="peer sr-only"
            />

            <span className="flex min-h-11 items-center justify-center rounded-control border border-line text-sm font-semibold text-secondary peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand-text">
              만족
            </span>
          </label>

          <label className="cursor-pointer">
            <input
              type="radio"
              checked={
                review.sentiment ===
                "dissatisfied"
              }
              onChange={() =>
                onChange(index, {
                  sentiment:
                    "dissatisfied",
                })
              }
              className="peer sr-only"
            />

            <span className="flex min-h-11 items-center justify-center rounded-control border border-line text-sm font-semibold text-secondary peer-checked:border-danger peer-checked:bg-danger-soft peer-checked:text-danger">
              불만족
            </span>
          </label>
        </div>
      </fieldset>

      {review.sentiment ===
        "dissatisfied" && (
        <div className="mt-4 rounded-control bg-surface-muted p-3">
          <p className="text-xs font-semibold text-main">
            불편한 점을 선택해 주세요
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {reasons.map((reason) => {
              const selected =
                review.reasonCodes.includes(
                  reason.value,
                );

              return (
                <button
                  key={reason.value}
                  type="button"
                  onClick={() =>
                    onToggleReason(
                      index,
                      reason.value,
                    )
                  }
                  className={[
                    "min-h-9 rounded-pill border",
                    "px-3 text-xs font-semibold",
                    selected
                      ? "border-[#191f28] bg-[#191f28] text-white"
                      : "border-line bg-white text-secondary",
                  ].join(" ")}
                >
                  {reason.label}
                </button>
              );
            })}
          </div>

          <textarea
            value={review.memo}
            onChange={(event) =>
              onChange(index, {
                memo:
                  event.target.value,
              })
            }
            rows={3}
            maxLength={500}
            placeholder="이 구간에서 불편했던 점을 적어 주세요."
            className={[
              "mt-3 w-full resize-none rounded-control",
              "border border-line bg-white",
              "p-3 text-sm text-main outline-none",
              "placeholder:text-muted focus:border-brand",
            ].join(" ")}
          />
        </div>
      )}
    </li>
  );
}

function RouteSegmentBar({
  route,
}: {
  route: TransitRoute;
}) {
  const visibleSteps =
    route.steps.filter(
      (step) =>
        step.time > 0 &&
        Number.isFinite(step.time),
    );

  const totalTime =
    visibleSteps.reduce(
      (sum, step) =>
        sum + step.time,
      0,
    ) || 1;

  const segmentWidths =
    visibleSteps.map(
      (step) =>
        (step.time / totalTime) *
        100,
    );

  return (
    <div className="mt-4 w-full">
      <div
        className="flex h-3 w-full overflow-hidden rounded-pill bg-line-light"
        aria-label="이동수단별 소요시간"
      >
        {visibleSteps.map(
          (step, index) => (
            <span
              key={`bar-${step.type}-${index}`}
              className={getRouteBarColor(
                step,
                index,
              )}
              style={{
                width: `${segmentWidths[index]}%`,
              }}
              title={`${getStepVehicleName(step)} ${secondsToMinutes(step.time)}분`}
            />
          ),
        )}
      </div>

      <ol className="mt-3 flex w-full">
        {visibleSteps.map(
          (step, index) => (
            <li
              key={`label-${step.type}-${index}`}
              className={[
                "min-w-0 text-center",
                "text-xs font-semibold",
                getRouteTextColor(
                  step,
                  index,
                ),
              ].join(" ")}
              style={{
                width: `${segmentWidths[index]}%`,
              }}
              title={`${getStepVehicleName(step)} ${secondsToMinutes(step.time)}분`}
            >
              <span className="block truncate px-1">
                {getStepVehicleName(
                  step,
                )}{" "}
                {secondsToMinutes(
                  step.time,
                )}
                분
              </span>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

function RouteFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex min-h-11 items-center",
        "justify-center rounded-control border",
        "px-5 text-sm font-bold",
        "transition-colors",
        active
          ? "border-[#191f28] bg-[#191f28] text-white"
          : "border-line bg-white text-secondary hover:border-secondary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function RouteSkeleton() {
  return (
    <Card>
      <div className="space-y-3">
        <div className="h-5 w-32 animate-pulse rounded bg-line-light" />
        <div className="h-28 animate-pulse rounded-control bg-surface-muted" />
        <div className="h-28 animate-pulse rounded-control bg-surface-muted" />
        <div className="h-28 animate-pulse rounded-control bg-surface-muted" />
      </div>
    </Card>
  );
}

function getWalkingSeconds(
  route: TransitRoute,
) {
  return route.steps
    .filter(
      (step) =>
        step.type === "WALKING",
    )
    .reduce(
      (total, step) =>
        total + step.time,
      0,
    );
}

function getVehicleSequence(
  route: TransitRoute,
) {
  const vehicles = route.steps
    .filter(
      (step) =>
        step.type !== "WALKING",
    )
    .flatMap((step) =>
      step.vehicles.length > 0
        ? step.vehicles
        : [
            step.type === "SUBWAY"
              ? "지하철"
              : "버스",
          ],
    );

  if (vehicles.length === 0) {
    return "도보 이동";
  }

  return vehicles.join(" → ");
}

function getStepVehicleName(
  step: TransitStep,
) {
  if (step.type === "WALKING") {
    return "도보";
  }

  if (step.vehicles.length > 0) {
    return step.vehicles.join(" → ");
  }

  if (step.type === "SUBWAY") {
    return "지하철";
  }

  return "버스";
}

function getRouteBarColor(
  step: TransitStep,
  index: number,
) {
  if (step.type === "WALKING") {
    return "bg-[#c7cdd5]";
  }

  if (step.type === "SUBWAY") {
    return "bg-[#5672e3]";
  }

  const busColors = [
    "bg-[#d8792f]",
    "bg-[#5672e3]",
    "bg-[#5ca57d]",
  ];

  return busColors[
    index % busColors.length
  ];
}

function getRouteTextColor(
  step: TransitStep,
  index: number,
) {
  if (step.type === "WALKING") {
    return "text-muted";
  }

  if (step.type === "SUBWAY") {
    return "text-[#5672e3]";
  }

  const busColors = [
    "text-[#c96a17]",
    "text-[#4964d4]",
    "text-[#458a65]",
  ];

  return busColors[
    index % busColors.length
  ];
}

async function readJsonResponse<T>(
  response: Response,
): Promise<T> {
  const text = await response.text();

  if (!text) {
    throw new Error(
      "서버에서 빈 응답을 받았습니다.",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      "경로 API가 올바른 JSON 응답을 반환하지 않았습니다.",
    );
  }
}

function getSegmentMode(
  type: TransitStep["type"],
) {
  if (type === "BUS") {
    return "bus";
  }

  if (type === "SUBWAY") {
    return "subway";
  }

  return "walk";
}

function secondsToMinutes(
  seconds: number,
) {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return 0;
  }

  return Math.max(
    1,
    Math.round(seconds / 60),
  );
}

function formatDistance(
  meters: number,
) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }

  return `${(meters / 1000).toFixed(1)}km`;
}

function getRouteStatusMessage(
  status: string,
) {
  if (status === "EQUAL_POINTS") {
    return "출발지와 도착지가 같습니다.";
  }

  if (status === "STARTNODES_NULL") {
    return "출발지 주변에서 대중교통 경로를 찾지 못했습니다.";
  }

  if (status === "ENDNODES_NULL") {
    return "도착지 주변에서 대중교통 경로를 찾지 못했습니다.";
  }

  return "이용 가능한 대중교통 경로를 찾지 못했습니다.";
}
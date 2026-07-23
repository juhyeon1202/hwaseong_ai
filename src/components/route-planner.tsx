"use client";

import Link from "next/link";
import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  KakaoMap,
  type MapMarkerData,
} from "@/components/kakao-map";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeader,
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

export function RoutePlanner() {
  const [startPlace, setStartPlace] =
    useState<Place | null>(null);

  const [endPlace, setEndPlace] =
    useState<Place | null>(null);

  const [routes, setRoutes] =
    useState<TransitRoute[]>([]);

  const [
    selectedRouteId,
    setSelectedRouteId,
  ] = useState<number | null>(null);

  const [landingUrl, setLandingUrl] =
    useState<string | null>(null);

  const [isSearching, setIsSearching] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const markers =
    useMemo<MapMarkerData[]>(() => {
      const nextMarkers: MapMarkerData[] =
        [];

      if (startPlace) {
        nextMarkers.push({
          id: `start-${startPlace.id}`,
          title: `출발 · ${startPlace.name}`,
          latitude:
            startPlace.latitude,
          longitude:
            startPlace.longitude,
        });
      }

      if (endPlace) {
        nextMarkers.push({
          id: `end-${endPlace.id}`,
          title: `도착 · ${endPlace.name}`,
          latitude: endPlace.latitude,
          longitude:
            endPlace.longitude,
        });
      }

      return nextMarkers;
    }, [startPlace, endPlace]);

  const mapCenter = useMemo(() => {
    if (startPlace && endPlace) {
      return {
        latitude:
          (startPlace.latitude +
            endPlace.latitude) /
          2,
        longitude:
          (startPlace.longitude +
            endPlace.longitude) /
          2,
      };
    }

    if (startPlace) {
      return {
        latitude: startPlace.latitude,
        longitude:
          startPlace.longitude,
      };
    }

    if (endPlace) {
      return {
        latitude: endPlace.latitude,
        longitude: endPlace.longitude,
      };
    }

    return {
      latitude: 37.1995,
      longitude: 126.8312,
    };
  }, [startPlace, endPlace]);

  const selectedRoute =
    routes.find(
      (route) =>
        route.id === selectedRouteId,
    ) ?? null;

  function changeStartPlace(
    place: Place,
  ) {
    setStartPlace(place);
    resetResults();
  }

  function changeEndPlace(place: Place) {
    setEndPlace(place);
    resetResults();
  }

  function swapPlaces() {
    setStartPlace(endPlace);
    setEndPlace(startPlace);
    resetResults();
  }

  function resetResults() {
    setRoutes([]);
    setLandingUrl(null);
    setSelectedRouteId(null);
    setErrorMessage("");
  }

  async function findRoutes() {
    if (!startPlace || !endPlace) {
      setErrorMessage(
        "출발지와 도착지를 모두 선택해 주세요.",
      );
      return;
    }

    setIsSearching(true);
    setErrorMessage("");
    setRoutes([]);
    setSelectedRouteId(null);

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

      const nextRoutes =
        result.routes ?? [];

      setRoutes(nextRoutes);
      setLandingUrl(result.landingUrl);

      if (nextRoutes.length > 0) {
        setSelectedRouteId(
          nextRoutes[0].id,
        );
      } else {
        setErrorMessage(
          getRouteStatusMessage(
            result.status,
          ),
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "경로 검색에 실패했습니다.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit">
          <SectionHeader
            title="출발지와 도착지"
            description="장소를 검색하고 대중교통 경로를 확인하세요."
          />

          <div className="mt-5 space-y-4">
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
                aria-label="출발지와 도착지 바꾸기"
                className="inline-flex min-h-10 items-center gap-2 rounded-pill border border-line bg-surface px-4 text-xs font-semibold text-secondary hover:bg-surface-muted"
              >
                출발지·도착지 바꾸기
              </button>
            </div>

            <PlaceSearch
              label="도착지"
              placeholder="예: 동탄역"
              selectedPlace={endPlace}
              onSelect={changeEndPlace}
            />

            {errorMessage && (
              <p
                role="alert"
                className="rounded-control bg-danger-soft p-3 text-sm leading-6 text-danger"
              >
                {errorMessage}
              </p>
            )}

            <Button
              fullWidth
              onClick={findRoutes}
              disabled={
                isSearching ||
                !startPlace ||
                !endPlace
              }
              className="bg-info hover:opacity-90"
            >
              {isSearching
                ? "경로 검색 중..."
                : "대중교통 경로 찾기"}
            </Button>
          </div>
        </Card>

        <Card
          padded={false}
          className="overflow-hidden"
        >
          <div className="border-b border-line-light px-5 py-4">
            <p className="font-bold text-main">
              경로 지도
            </p>

            <p className="mt-1 text-xs text-muted">
              검색한 출발지와 도착지가
              지도에 표시됩니다.
            </p>
          </div>

          <KakaoMap
            center={mapCenter}
            markers={markers}
            level={
              startPlace && endPlace
                ? 8
                : 9
            }
            height={430}
          />

          <div className="flex flex-wrap gap-4 border-t border-line-light px-5 py-3 text-xs text-muted">
            <span>
              <strong className="text-info">
                출발
              </strong>
              {" "}
              {startPlace?.name ??
                "선택 전"}
            </span>

            <span>
              <strong className="text-brand-text">
                도착
              </strong>
              {" "}
              {endPlace?.name ??
                "선택 전"}
            </span>
          </div>
        </Card>
      </div>

      {isSearching && (
        <Card>
          <div className="space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-line-light" />
            <div className="h-24 animate-pulse rounded-control bg-surface-muted" />
            <div className="h-24 animate-pulse rounded-control bg-surface-muted" />
          </div>
        </Card>
      )}

      {!isSearching &&
        startPlace &&
        endPlace &&
        routes.length === 0 &&
        !errorMessage && (
          <EmptyState
            title="경로를 검색해 주세요"
            description="출발지와 도착지를 확인한 후 대중교통 경로 찾기 버튼을 눌러 주세요."
          />
        )}

      {routes.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="추천 대중교통 경로"
            description={`${routes.length}개의 경로를 찾았습니다. 이용할 경로를 선택해 주세요.`}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            {routes.map(
              (route, index) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  recommended={
                    index === 0
                  }
                  selected={
                    selectedRouteId ===
                    route.id
                  }
                  onSelect={() =>
                    setSelectedRouteId(
                      route.id,
                    )
                  }
                />
              ),
            )}
          </div>

          {selectedRoute &&
            startPlace &&
            endPlace && (
              <Card className="border-info bg-info-soft">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Badge variant="info">
                      선택한 경로
                    </Badge>

                    <p className="mt-3 font-bold text-main">
                      {startPlace.name}
                      {" → "}
                      {endPlace.name}
                    </p>

                    <p className="mt-1 text-sm text-secondary">
                      예상 소요시간{" "}
                      {formatMinutes(
                        selectedRoute.totalTime,
                      )}
                      {" · "}
                      환승{" "}
                      {selectedRoute.transfers}
                      회
                    </p>
                  </div>

                  <Link
                    href={createJournalUrl(
                      startPlace,
                      endPlace,
                      selectedRoute,
                    )}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-hover"
                  >
                    이 경로로 교통일지 작성
                  </Link>
                </div>
              </Card>
            )}

          {landingUrl && (
            <a
              href={landingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold text-info hover:bg-info-soft"
            >
              카카오맵에서 자세히 보기
            </a>
          )}
        </section>
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
        <label className="text-sm font-semibold text-main">
          {label}
        </label>

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
          className="min-h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-sm text-main outline-none focus:border-info"
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
        <div className="mt-2 rounded-control bg-info-soft p-3">
          <p className="text-sm font-semibold text-main">
            {selectedPlace.name}
          </p>

          <p className="mt-1 text-xs text-muted">
            {selectedPlace.address}
          </p>
        </div>
      )}

      {message && (
        <p
          role="alert"
          className="mt-2 text-xs text-danger"
        >
          {message}
        </p>
      )}

      {places.length > 0 && (
        <ul className="mt-2 max-h-64 overflow-y-auto rounded-control border border-line bg-surface">
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

type RouteCardProps = {
  route: TransitRoute;
  recommended: boolean;
  selected: boolean;
  onSelect: () => void;
};

function RouteCard({
  route,
  recommended,
  selected,
  onSelect,
}: RouteCardProps) {
  return (
    <Card
      className={[
        "transition-colors",
        selected
          ? "border-info ring-2 ring-info/20"
          : "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-2">
        {recommended && (
          <Badge variant="brand">
            추천
          </Badge>
        )}

        <Badge variant="info">
          {getRouteTypeLabel(
            route.type,
          )}
        </Badge>

        <strong className="ml-auto text-xl text-main">
          {formatMinutes(
            route.totalTime,
          )}
        </strong>
      </div>

      <RouteSegmentBar
        steps={route.steps}
      />

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <RouteInfo
          label="환승"
          value={`${route.transfers}회`}
        />

        <RouteInfo
          label="거리"
          value={formatDistance(
            route.totalDistance,
          )}
        />

        <RouteInfo
          label="요금"
          value={
            route.fare === null
              ? "정보 없음"
              : `${route.fare.toLocaleString()}원`
          }
        />
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-secondary">
          세부 이동 경로 보기
        </summary>

        <ol className="mt-4 space-y-3">
          {route.steps.map(
            (step, index) => (
              <li
                key={`${route.id}-${index}`}
                className="flex gap-3"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-xs font-bold text-secondary">
                  {index + 1}
                </span>

                <div className="min-w-0 pt-1">
                  <p className="text-sm font-semibold text-main">
                    {step.vehicles
                      .length > 0
                      ? step.vehicles.join(
                          ", ",
                        )
                      : getStepTypeLabel(
                          step.type,
                        )}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted">
                    {step.guidance}
                    {" · "}
                    {formatMinutes(
                      step.time,
                    )}
                    {" · "}
                    {formatDistance(
                      step.distance,
                    )}
                  </p>
                </div>
              </li>
            ),
          )}
        </ol>
      </details>

      <Button
        fullWidth
        variant={
          selected
            ? "primary"
            : "secondary"
        }
        onClick={onSelect}
        className="mt-5"
      >
        {selected
          ? "선택된 경로"
          : "이 경로 선택"}
      </Button>
    </Card>
  );
}

function RouteSegmentBar({
  steps,
}: {
  steps: TransitStep[];
}) {
  const visibleSteps = steps.filter(
    (step) => step.time > 0,
  );

  const totalTime =
    visibleSteps.reduce(
      (sum, step) =>
        sum + step.time,
      0,
    ) || 1;

  return (
    <div
      className="mt-4 flex h-2 overflow-hidden rounded-pill bg-line-light"
      aria-hidden="true"
    >
      {visibleSteps.map(
        (step, index) => (
          <span
            key={`${step.type}-${index}`}
            className={
              step.type === "BUS"
                ? "bg-info"
                : step.type ===
                    "SUBWAY"
                  ? "bg-success"
                  : "bg-line"
            }
            style={{
              width: `${Math.max(
                4,
                (step.time /
                  totalTime) *
                  100,
              )}%`,
            }}
          />
        ),
      )}
    </div>
  );
}

function RouteInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-control bg-surface-muted p-3">
      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-main">
        {value}
      </p>
    </div>
  );
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
    if (response.status === 404) {
      throw new Error(
        "경로 API 주소를 찾지 못했습니다. API 파일 위치를 확인해 주세요.",
      );
    }

    throw new Error(
      "서버가 올바른 JSON 응답을 반환하지 않았습니다.",
    );
  }
}

function createJournalUrl(
  start: Place,
  end: Place,
  route: TransitRoute,
) {
  const params =
    new URLSearchParams({
      origin: start.name,
      destination: end.name,
      duration: String(
        Math.max(
          1,
          Math.round(
            route.totalTime / 60,
          ),
        ),
      ),
      mode: getJournalMode(
        route.type,
      ),
    });

  return `/journal?${params.toString()}`;
}

function getJournalMode(
  type: TransitRoute["type"],
) {
  if (type === "BUS") {
    return "bus";
  }

  if (type === "SUBWAY") {
    return "subway";
  }

  return "other";
}

function getRouteTypeLabel(
  type: TransitRoute["type"],
) {
  if (type === "BUS") {
    return "버스";
  }

  if (type === "SUBWAY") {
    return "지하철";
  }

  return "버스 + 지하철";
}

function getStepTypeLabel(
  type: TransitStep["type"],
) {
  if (type === "BUS") {
    return "버스 이동";
  }

  if (type === "SUBWAY") {
    return "지하철 이동";
  }

  return "도보 이동";
}

function formatMinutes(seconds: number) {
  const minutes = Math.max(
    1,
    Math.round(seconds / 60),
  );

  return `${minutes}분`;
}

function formatDistance(meters: number) {
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

  return "이동 가능한 대중교통 경로를 찾지 못했습니다.";
}
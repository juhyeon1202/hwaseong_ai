"use client";

import {
  FormEvent,
  useState,
} from "react";

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

  const [landingUrl, setLandingUrl] =
    useState<string | null>(null);

  const [isSearching, setIsSearching] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

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
        (await response.json()) as RouteResponse;

      if (!response.ok) {
        throw new Error(
          result.message ??
            "경로 검색에 실패했습니다.",
        );
      }

      setRoutes(result.routes);
      setLandingUrl(result.landingUrl);

      if (result.routes.length === 0) {
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
      <Card>
        <SectionHeader
          title="출발지와 도착지"
          description="장소를 검색한 후 대중교통 경로를 확인하세요."
        />

        <div className="mt-5 space-y-4">
          <PlaceSearch
            label="출발지"
            placeholder="예: 병점역"
            selectedPlace={startPlace}
            onSelect={setStartPlace}
            allowCurrentLocation
          />

          <PlaceSearch
            label="도착지"
            placeholder="예: 동탄역"
            selectedPlace={endPlace}
            onSelect={setEndPlace}
          />

          {errorMessage && (
            <p
              role="alert"
              className="rounded-control bg-danger-soft p-3 text-sm text-danger"
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
          >
            {isSearching
              ? "경로 검색 중..."
              : "대중교통 경로 찾기"}
          </Button>
        </div>
      </Card>

      {routes.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="추천 경로"
            description={`${routes.length}개의 대중교통 경로를 찾았습니다.`}
          />

          <div className="space-y-3">
            {routes.map(
              (route, index) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  recommended={
                    index === 0
                  }
                />
              ),
            )}
          </div>

          {landingUrl && (
            <a
              href={landingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold text-secondary"
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

      const result = (await response.json()) as {
        places?: Place[];
        message?: string;
      };

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
        "현재 위치를 사용할 수 없는 브라우저입니다.",
      );
      return;
    }

    setIsLoading(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentPlace: Place = {
          id: "current-location",
          name: "현재 위치",
          address:
            "기기에서 확인한 현재 위치",
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude,
        };

        selectPlace(currentPlace);
        setIsLoading(false);
      },
      () => {
        setMessage(
          "위치 권한을 허용해 주세요.",
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
            className="min-h-9 text-xs font-semibold text-brand-text"
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
          className="min-h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-sm text-main outline-none focus:border-brand"
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
        <div className="mt-2 rounded-control bg-brand-softer p-3">
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
        <ul className="mt-2 overflow-hidden rounded-control border border-line bg-surface">
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
                className="min-h-14 w-full px-4 py-3 text-left active:bg-surface-muted"
              >
                <strong className="block text-sm text-main">
                  {place.name}
                </strong>

                <span className="mt-1 block text-xs text-muted">
                  {place.address ||
                    "주소 정보 없음"}
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
};

function RouteCard({
  route,
  recommended,
}: RouteCardProps) {
  return (
    <Card>
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

      <ol className="mt-5 space-y-3">
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
                  {step.vehicles.length >
                  0
                    ? step.vehicles.join(
                        ", ",
                      )
                    : getStepTypeLabel(
                        step.type,
                      )}
                </p>

                <p className="mt-1 text-xs leading-5 text-muted">
                  {step.guidance}
                  {` · ${formatMinutes(step.time)}`}
                </p>
              </div>
            </li>
          ),
        )}
      </ol>
    </Card>
  );
}

type RouteInfoProps = {
  label: string;
  value: string;
};

function RouteInfo({
  label,
  value,
}: RouteInfoProps) {
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
    return `${meters}m`;
  }

  return `${(meters / 1000).toFixed(1)}km`;
}

function getRouteStatusMessage(
  status: string,
) {
  if (status === "EQUAL_POINTS") {
    return "출발지와 도착지가 같습니다.";
  }

  if (
    status === "STARTNODES_NULL"
  ) {
    return "출발지 주변에서 경로를 찾지 못했습니다.";
  }

  if (status === "ENDNODES_NULL") {
    return "도착지 주변에서 경로를 찾지 못했습니다.";
  }

  return "이동 가능한 대중교통 경로를 찾지 못했습니다.";
}
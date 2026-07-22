"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  KakaoMap,
  type MapMarkerData,
} from "@/components/kakao-map";

import {
  Badge,
} from "@/components/ui";

import { createClient } from "@/lib/supabase/client";

type RouteStopMapProps = {
  stopIds: number[];
};

type StopLocationRow = {
  id: number;
  name: string;
  location: unknown;
};

type StopLocation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

const HWASEONG_CENTER = {
  latitude: 37.1995,
  longitude: 126.8312,
};

export function RouteStopMap({
  stopIds,
}: RouteStopMapProps) {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [
    stopLocations,
    setStopLocations,
  ] = useState<StopLocation[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const stopIdKey =
    stopIds.join(",");

  useEffect(() => {
    let active = true;

    async function loadStopLocations() {
      if (stopIds.length === 0) {
        setStopLocations([]);
        setError("");
        return;
      }

      setIsLoading(true);
      setError("");

      const { data, error } =
        await supabase
          .from("transit_stops")
          .select(
            `
              id,
              name,
              location
            `,
          )
          .in("id", stopIds);

      if (!active) {
        return;
      }

      if (error) {
        setStopLocations([]);
        setError(
          "정류장 위치를 불러오지 못했습니다.",
        );
        setIsLoading(false);
        return;
      }

      const rows =
        (data as
          | StopLocationRow[]
          | null) ?? [];

      const locationById =
        new Map<number, StopLocation>();

      rows.forEach((row) => {
        const coordinate =
          parseLocation(
            row.location,
          );

        if (!coordinate) {
          return;
        }

        locationById.set(
          Number(row.id),
          {
            id: Number(row.id),
            name: row.name,
            latitude:
              coordinate.latitude,
            longitude:
              coordinate.longitude,
          },
        );
      });

      const orderedLocations =
        stopIds
          .map((stopId) =>
            locationById.get(stopId),
          )
          .filter(
            (
              location,
            ): location is StopLocation =>
              Boolean(location),
          );

      setStopLocations(
        orderedLocations,
      );

      if (
        orderedLocations.length === 0
      ) {
        setError(
          "선택한 정류장의 좌표 정보가 없습니다.",
        );
      }

      setIsLoading(false);
    }

    void loadStopLocations();

    return () => {
      active = false;
    };
  }, [
    stopIdKey,
    stopIds,
    supabase,
  ]);

  const markers =
    useMemo<MapMarkerData[]>(
      () =>
        stopLocations.map(
          (stop, index) => ({
            id: stop.id,
            latitude:
              stop.latitude,
            longitude:
              stop.longitude,
            title: `${index + 1}. ${stop.name}`,
          }),
        ),
      [stopLocations],
    );

  const center = useMemo(() => {
    if (
      stopLocations.length === 0
    ) {
      return HWASEONG_CENTER;
    }

    const total =
      stopLocations.reduce(
        (result, stop) => ({
          latitude:
            result.latitude +
            stop.latitude,
          longitude:
            result.longitude +
            stop.longitude,
        }),
        {
          latitude: 0,
          longitude: 0,
        },
      );

    return {
      latitude:
        total.latitude /
        stopLocations.length,
      longitude:
        total.longitude /
        stopLocations.length,
    };
  }, [stopLocations]);

  if (stopIds.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-light px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-main">
            선택 정류장 지도
          </h3>

          <p className="mt-1 text-xs text-muted">
            정류장 위치와 이동 순서를
            확인하세요.
          </p>
        </div>

        <Badge variant="info">
          {stopLocations.length}
          개 표시
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex h-72 items-center justify-center bg-surface-muted">
          <div className="text-center">
            <span
              aria-hidden="true"
              className="mx-auto block size-8 animate-spin rounded-full border-4 border-line border-t-info"
            />

            <p className="mt-3 text-sm text-muted">
              정류장 위치 확인 중...
            </p>
          </div>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex h-48 items-center justify-center bg-surface-muted p-6"
        >
          <div className="text-center">
            <p className="font-semibold text-main">
              지도를 표시할 수 없습니다
            </p>

            <p className="mt-2 text-sm text-danger">
              {error}
            </p>
          </div>
        </div>
      ) : (
        <>
          <KakaoMap
            center={center}
            markers={markers}
            level={
              stopLocations.length <= 2
                ? 5
                : 8
            }
            height={320}
          />

          <ol className="grid gap-2 border-t border-line-light p-4 sm:grid-cols-2">
            {stopLocations.map(
              (stop, index) => (
                <li
                  key={stop.id}
                  className="flex min-w-0 items-center gap-3 rounded-control bg-surface-muted p-3"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-info text-xs font-bold text-white">
                    {index + 1}
                  </span>

                  <span className="truncate text-sm font-semibold text-main">
                    {stop.name}
                  </span>
                </li>
              ),
            )}
          </ol>
        </>
      )}
    </section>
  );
}

function parseLocation(
  location: unknown,
): {
  latitude: number;
  longitude: number;
} | null {
  if (
    typeof location === "object" &&
    location !== null
  ) {
    if (
      "coordinates" in location &&
      Array.isArray(
        location.coordinates,
      )
    ) {
      return parseCoordinates(
        location.coordinates,
      );
    }
  }

  if (typeof location !== "string") {
    return null;
  }

  const trimmed =
    location.trim();

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(
        trimmed,
      ) as {
        coordinates?: unknown;
      };

      if (
        Array.isArray(
          parsed.coordinates,
        )
      ) {
        return parseCoordinates(
          parsed.coordinates,
        );
      }
    } catch {
      return null;
    }
  }

  const pointMatch =
    trimmed.match(
      /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i,
    );

  if (!pointMatch) {
    return null;
  }

  const longitude =
    Number(pointMatch[1]);

  const latitude =
    Number(pointMatch[2]);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function parseCoordinates(
  coordinates: unknown[],
) {
  const longitude =
    Number(coordinates[0]);

  const latitude =
    Number(coordinates[1]);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}
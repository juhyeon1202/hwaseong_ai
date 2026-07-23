"use client";

import { useMemo, useState } from "react";

import {
  KakaoMap,
  type MapMarkerData,
} from "@/components/kakao-map";

type ReportKind =
  | "full_pass"
  | "dispatch_delay"
  | "transfer_failure";

type LocationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "denied"
  | "unsupported"
  | "error";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type NearbyStop = {
  externalId: string;
  name: string;
  stopNumber: string | null;
  districtName: string | null;
  cityCode: string | null;
  latitude: number;
  longitude: number;
  distance: number;
};

type ReportSuccess = {
  stopName: string;
  stopNumber: string | null;
  kind: ReportKind;
  reportedAt: string;
};

const reportOptions: Array<{
  kind: ReportKind;
  label: string;
  description: string;
  border: string;
  dot: string;
  hover: string;
}> = [
  {
    kind: "full_pass",
    label: "만차 통과",
    description: "버스가 가득 차 정류장을 그냥 지나갔어요.",
    border: "border-[#cf4139]",
    dot: "bg-[#cf4139]",
    hover: "hover:bg-[#fff7f6]",
  },
  {
    kind: "dispatch_delay",
    label: "배차 지연",
    description: "예정 시간보다 버스가 늦게 도착했어요.",
    border: "border-[#e8a52d]",
    dot: "bg-[#e8a52d]",
    hover: "hover:bg-[#fffaf0]",
  },
  {
    kind: "transfer_failure",
    label: "환승 실패",
    description: "연계 버스를 놓쳐 환승하지 못했어요.",
    border: "border-[#58a04e]",
    dot: "bg-[#58a04e]",
    hover: "hover:bg-[#f5fbf4]",
  },
];

const reportLabels: Record<ReportKind, string> = {
  full_pass: "만차 통과",
  dispatch_delay: "배차 지연",
  transfer_failure: "환승 실패",
};

export function ReportPanel() {
  const [coordinates, setCoordinates] =
    useState<Coordinates | null>(null);
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [selectedExternalId, setSelectedExternalId] =
    useState<string | null>(null);
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("idle");
  const [submittingKind, setSubmittingKind] =
    useState<ReportKind | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [success, setSuccess] =
    useState<ReportSuccess | null>(null);

  const selectedStop =
    nearbyStops.find(
      (stop) => stop.externalId === selectedExternalId,
    ) ?? null;

  const mapMarkers = useMemo<MapMarkerData[]>(() => {
    const markers: MapMarkerData[] = nearbyStops.map((stop) => ({
      id: stop.externalId,
      latitude: stop.latitude,
      longitude: stop.longitude,
      title: stop.stopNumber
        ? `${stop.name} (${stop.stopNumber})`
        : stop.name,
    }));

    if (coordinates) {
      markers.push({
        id: "current-location",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        title: "현재 위치",
      });
    }

    return markers;
  }, [coordinates, nearbyStops]);

  const mapCenter = selectedStop
    ? {
        latitude: selectedStop.latitude,
        longitude: selectedStop.longitude,
      }
    : coordinates ?? {
        latitude: 37.1995,
        longitude: 127.0645,
      };

  function requestLocation() {
    setMessage("");
    setIsError(false);
    setNearbyStops([]);
    setSelectedExternalId(null);

    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      setIsError(true);
      setMessage("현재 브라우저는 위치 확인을 지원하지 않습니다.");
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void loadNearbyStops({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        setIsError(true);

        if (
          error.code === GeolocationPositionError.PERMISSION_DENIED
        ) {
          setLocationStatus("denied");
          setMessage(
            "위치 권한이 거부되었습니다. 브라우저에서 위치 권한을 허용해 주세요.",
          );
          return;
        }

        setLocationStatus("error");
        setMessage("현재 위치를 확인하지 못했습니다.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }

  async function loadNearbyStops(current: Coordinates) {
    setCoordinates(current);

    try {
      const params = new URLSearchParams({
        latitude: String(current.latitude),
        longitude: String(current.longitude),
      });

      const response = await fetch(
        `/api/anonymous-reports?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const result = (await response.json()) as {
        stops?: NearbyStop[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.message ?? "주변 정류장 조회에 실패했습니다.",
        );
      }

      const stops = result.stops ?? [];

      setNearbyStops(stops);
      setLocationStatus("ready");

      if (stops.length > 0) {
        setSelectedExternalId(stops[0].externalId);
        setMessage(
          `반경 500m 이내 정류장 ${stops.length}곳을 찾았습니다.`,
        );
      } else {
        setMessage(
          "현재 위치 반경 500m 이내에 버스정류장이 없습니다.",
        );
      }
    } catch (error) {
      setLocationStatus("error");
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "주변 정류장을 불러오지 못했습니다.",
      );
    }
  }

  function handleMarkerClick(marker: MapMarkerData) {
    if (marker.id === "current-location") {
      setMessage("현재 위치입니다.");
      return;
    }

    const externalId = String(marker.id);
    const stop = nearbyStops.find(
      (item) => item.externalId === externalId,
    );

    if (!stop) {
      return;
    }

    setSelectedExternalId(stop.externalId);
    setIsError(false);
    setMessage(`${stop.name} 정류장을 선택했습니다.`);
  }

  async function submitReport(kind: ReportKind) {
    if (!coordinates) {
      setIsError(true);
      setMessage("먼저 현재 위치를 확인해 주세요.");
      return;
    }

    if (!selectedStop) {
      setIsError(true);
      setMessage("신고할 정류장을 선택해 주세요.");
      return;
    }

    setSubmittingKind(kind);
    setIsError(false);
    setMessage("");

    try {
      const response = await fetch("/api/anonymous-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId: selectedStop.externalId,
          name: selectedStop.name,
          stopNumber: selectedStop.stopNumber,
          districtName: selectedStop.districtName,
          cityCode: selectedStop.cityCode,
          latitude: selectedStop.latitude,
          longitude: selectedStop.longitude,
          userLatitude: coordinates.latitude,
          userLongitude: coordinates.longitude,
          kind,
        }),
      });

      const result = (await response.json()) as {
        reportedAt?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.message ?? "신고 접수에 실패했습니다.",
        );
      }

      setSuccess({
        stopName: selectedStop.name,
        stopNumber: selectedStop.stopNumber,
        kind,
        reportedAt:
          result.reportedAt ?? new Date().toISOString(),
      });
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "신고를 저장하지 못했습니다.",
      );
    } finally {
      setSubmittingKind(null);
    }
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[620px]">
        <div className="overflow-hidden rounded-[28px] border border-[#e5e8eb] bg-white shadow-[0_18px_45px_rgba(25,31,40,0.08)]">
          <header className="flex items-center justify-between border-b border-[#e5e8eb] px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-[#8b95a1]">
                원터치 익명 신고
              </p>
              <h1 className="mt-1 text-xl font-bold text-[#191f28]">
                정류장 불편 신고
              </h1>
            </div>

            <span className="rounded-full border border-[#e5e8eb] px-3 py-1.5 text-xs font-bold text-[#4e5968]">
              익명
            </span>
          </header>

          <div className="space-y-5 p-5 sm:p-6">
            <div className="rounded-2xl bg-[#f7f8fa] p-4">
              <strong className="block text-sm text-[#191f28]">
                현재 위치를 확인해 주세요
              </strong>

              <p className="mt-1 text-xs leading-5 text-[#8b95a1]">
                반경 500m 이내 버스정류장을 자동으로 찾습니다.
              </p>

              <button
                type="button"
                onClick={requestLocation}
                disabled={locationStatus === "loading"}
                className="mt-4 min-h-12 w-full rounded-xl bg-[#191f28] px-4 text-sm font-bold text-white transition hover:bg-[#333d4b] disabled:opacity-60"
              >
                {locationStatus === "loading"
                  ? "주변 정류장 확인 중..."
                  : "현재 위치 확인하기"}
              </button>
            </div>

            {coordinates && (
              <div className="overflow-hidden rounded-2xl border border-[#e5e8eb]">
                <KakaoMap
                  center={mapCenter}
                  markers={mapMarkers}
                  level={4}
                  height={190}
                  onMarkerClick={handleMarkerClick}
                />
              </div>
            )}

            {locationStatus === "ready" && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#191f28]">
                      가까운 버스정류장
                    </h2>
                    <p className="mt-1 text-xs text-[#8b95a1]">
                      반경 500m · 가까운 거리순
                    </p>
                  </div>

                  <span className="rounded-full bg-[#e8f1ff] px-3 py-1.5 text-xs font-bold text-[#2f6fed]">
                    {nearbyStops.length}곳
                  </span>
                </div>

                <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                  {nearbyStops.map((stop) => {
                    const selected =
                      selectedExternalId === stop.externalId;

                    return (
                      <button
                        key={stop.externalId}
                        type="button"
                        onClick={() => {
                          setSelectedExternalId(stop.externalId);
                          setIsError(false);
                          setMessage(
                            `${stop.name} 정류장을 선택했습니다.`,
                          );
                        }}
                        className={[
                          "flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition",
                          selected
                            ? "border-[#ec7211] bg-[#fff8f2]"
                            : "border-[#e5e8eb] bg-white hover:border-[#b0b8c1]",
                        ].join(" ")}
                      >
                        <span className="min-w-0">
                          <strong className="block truncate text-sm text-[#191f28]">
                            {stop.name}
                          </strong>
                          <span className="mt-1 block text-xs text-[#8b95a1]">
                            {stop.stopNumber
                              ? `정류장 ${stop.stopNumber}`
                              : "버스정류장"}
                          </span>
                        </span>

                        <span className="shrink-0 text-xs font-semibold text-[#4e5968]">
                          {Math.round(stop.distance)}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {selectedStop && (
              <section className="rounded-2xl border border-[#f3c89f] bg-[#fffaf5] p-4">
                <p className="text-xs font-semibold text-[#ec7211]">
                  현재 선택된 정류장
                </p>
                <strong className="mt-1 block text-base text-[#191f28]">
                  {selectedStop.name}
                </strong>
              </section>
            )}

            <section>
              <h2 className="text-lg font-bold text-[#191f28]">
                원터치 익명 신고
              </h2>

              <p className="mt-1 text-xs text-[#8b95a1]">
                불편 유형을 한 번 눌러 바로 접수하세요.
              </p>

              <div className="mt-4 space-y-3">
                {reportOptions.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    disabled={
                      !selectedStop ||
                      submittingKind !== null
                    }
                    onClick={() => void submitReport(option.kind)}
                    className={[
                      "flex min-h-[84px] w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition",
                      "disabled:cursor-not-allowed disabled:opacity-45",
                      option.border,
                      option.hover,
                    ].join(" ")}
                  >
                    <span
                      className={`size-9 shrink-0 rounded-full ${option.dot}`}
                    />

                    <span>
                      <strong className="block text-base text-[#191f28]">
                        {submittingKind === option.kind
                          ? "접수 중..."
                          : option.label}
                      </strong>
                      <span className="mt-1 block text-xs text-[#8b95a1]">
                        {option.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {message && (
              <p
                role={isError ? "alert" : "status"}
                className={[
                  "rounded-xl px-4 py-3 text-sm leading-6",
                  isError
                    ? "bg-[#fff1f0] text-[#cf4139]"
                    : "bg-[#edf8ec] text-[#397b32]",
                ].join(" ")}
              >
                {message}
              </p>
            )}
          </div>
        </div>
      </section>

      {success && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#191f28]/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-[28px] bg-white p-7 text-center shadow-2xl">
            <span className="mx-auto flex size-24 items-center justify-center rounded-full bg-[#cf4139] text-xl font-bold text-white">
              접수
            </span>

            <h2 className="mt-6 text-2xl font-bold text-[#191f28]">
              익명으로 접수되었습니다
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#8b95a1]">
              {success.stopName}
              <br />
              {reportLabels[success.kind]}
            </p>

            <p className="mt-5 rounded-xl bg-[#fffaf5] px-4 py-3 text-sm text-[#4e5968]">
              {formatDateTime(success.reportedAt)}
            </p>

            <button
              type="button"
              onClick={() => {
                setSuccess(null);
                setMessage("익명 신고가 DB에 저장되었습니다.");
              }}
              className="mt-6 min-h-12 w-full rounded-xl border border-[#d1d6db] bg-white text-sm font-bold text-[#333d4b] hover:bg-[#f4f5f7]"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
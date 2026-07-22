"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  KakaoMap,
  type MapMarkerData,
} from "@/components/kakao-map";

type ReportKind =
  | "full_pass"
  | "dispatch_delay"
  | "transfer_failure";

type TransitStop = {
  id: number;
  external_id: string;
  name: string;
  stop_number: string | null;
  district_name: string | null;
  latitude: number;
  longitude: number;
};

type ReportSummary = {
  stop_id: number;
  kind: ReportKind;
  route_number: string | null;
  report_count: number;
  latest_report_at: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "denied"
  | "unsupported"
  | "error";

const reportOptions = [
  {
    kind: "full_pass",
    label: "만차 통과",
    description: "버스가 만차 상태로 지나갔어요.",
    icon: "●",
    containerClass:
      "border-danger bg-danger-soft text-danger",
  },
  {
    kind: "dispatch_delay",
    label: "배차 지연",
    description: "예정 시간보다 버스가 늦어요.",
    icon: "●",
    containerClass:
      "border-warning bg-warning-soft text-warning",
  },
  {
    kind: "transfer_failure",
    label: "환승 실패",
    description: "연결편을 놓쳐 환승하지 못했어요.",
    icon: "●",
    containerClass:
      "border-success bg-success-soft text-success",
  },
] satisfies Array<{
  kind: ReportKind;
  label: string;
  description: string;
  icon: string;
  containerClass: string;
}>;

const reportLabels: Record<
  ReportKind,
  string
> = {
  full_pass: "만차 통과",
  dispatch_delay: "배차 지연",
  transfer_failure: "환승 실패",
};

export function ReportPanel() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [stops, setStops] = useState<
    TransitStop[]
  >([]);

  const [selectedStopId, setSelectedStopId] =
    useState<number | null>(null);

  const [routeNumber, setRouteNumber] =
    useState("");

  const [coordinates, setCoordinates] =
    useState<Coordinates | null>(null);

  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("idle");

  const [summaries, setSummaries] = useState<
    ReportSummary[]
  >([]);

  const [isLoadingStops, setIsLoadingStops] =
    useState(true);

  const [submittingKind, setSubmittingKind] =
    useState<ReportKind | null>(null);

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const selectedStop =
    stops.find(
      (stop) => stop.id === selectedStopId,
    ) ?? null;

  const stopMarkers =
    useMemo<MapMarkerData[]>(() => {
      const markers: MapMarkerData[] =
        stops.map((stop) => ({
          id: stop.id,
          latitude: stop.latitude,
          longitude: stop.longitude,
          title: stop.stop_number
            ? `${stop.name} (${stop.stop_number})`
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
    }, [coordinates, stops]);

  const mapCenter = useMemo(() => {
    if (coordinates) {
      return {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };
    }

  if (selectedStop) {
    return {
      latitude: selectedStop.latitude,
      longitude: selectedStop.longitude,
    };
  }

  return {
    latitude: 37.1995,
    longitude: 127.0645,
  };
}, [coordinates, selectedStop]);

const handleMarkerClick =
  useCallback(
    (marker: MapMarkerData) => {
      if (
        marker.id === "current-location"
      ) {
        return;
      }

      setSelectedStopId(
        Number(marker.id),
      );

      setMessage(
        `${marker.title} 정류장을 선택했습니다.`,
      );

      setIsError(false);
    },
    [],
  );

  const loadStops = useCallback(async () => {
    setIsLoadingStops(true);

    const { data, error } = await supabase
      .from("transit_stop_map")
      .select(
        `
          id,
          external_id,
          name,
          stop_number,
          district_name,
          latitude,
          longitude
        `,
      )
      .order("name")
      .limit(100);

    if (error) {
      setIsError(true);
      setMessage(
        "정류장 목록을 불러오지 못했습니다.",
      );
      setIsLoadingStops(false);
      return;
    }

    const loadedStops = data ?? [];

    setStops(loadedStops);

    if (loadedStops.length > 0) {
      setSelectedStopId((current) => {
        return current ?? loadedStops[0].id;
      });
    }

    setIsLoadingStops(false);
  }, [supabase]);

  const loadSummary = useCallback(async () => {
    if (!selectedStopId) {
      setSummaries([]);
      return;
    }

    const { data, error } = await supabase
      .from("stop_report_10m")
      .select(
        `
          stop_id,
          kind,
          route_number,
          report_count,
          latest_report_at
        `,
      )
      .eq("stop_id", selectedStopId)
      .order("report_count", {
        ascending: false,
      });

    if (error) {
      setSummaries([]);
      return;
    }

    setSummaries(
      (data ?? []) as ReportSummary[],
    );
  }, [selectedStopId, supabase]);

  function requestLocation() {
    setMessage("");
    setIsError(false);

    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      setIsError(true);
      setMessage(
        "이 브라우저는 위치 기능을 지원하지 않습니다.",
      );
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude,
        });

        setLocationStatus("ready");
        setMessage(
          "현재 위치를 확인했습니다. 좌표는 저장되지 않습니다.",
        );
      },
      (error) => {
        setCoordinates(null);
        setIsError(true);

        if (
          error.code ===
          GeolocationPositionError.PERMISSION_DENIED
        ) {
          setLocationStatus("denied");
          setMessage(
            "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.",
          );
          return;
        }

        setLocationStatus("error");
        setMessage(
          "현재 위치를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }

  async function submitReport(
    kind: ReportKind,
  ) {
    setMessage("");
    setIsError(false);

    if (!selectedStopId) {
      setIsError(true);
      setMessage("정류장을 선택해 주세요.");
      return;
    }

    if (!coordinates) {
      setIsError(true);
      setMessage(
        "신고 전에 현재 위치를 확인해 주세요.",
      );
      return;
    }

    setSubmittingKind(kind);

    const { error } = await supabase.rpc(
      "submit_anonymous_report",
      {
        p_stop_id: selectedStopId,
        p_kind: kind,
        p_lat: coordinates.latitude,
        p_lng: coordinates.longitude,
        p_route_number:
          routeNumber.trim() || null,
      },
    );

    setSubmittingKind(null);

    if (error) {
      setIsError(true);

      if (
        error.message.includes(
          "정류장 반경 50m",
        )
      ) {
        setMessage(
          "선택한 정류장 반경 50m 안에서만 신고할 수 있습니다.",
        );
        return;
      }

      setMessage(
        `신고를 접수하지 못했습니다: ${error.message}`,
      );
      return;
    }

    setMessage(
      `${reportLabels[kind]} 신고가 익명으로 접수되었습니다.`,
    );

    await loadSummary();
  }

  useEffect(() => {
    void loadStops();
  }, [loadStops]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const channel = supabase
      .channel("anonymous-report-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "anonymous_reports",
        },
        () => {
          void loadSummary();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadSummary, supabase]);

  if (
    !isLoadingStops &&
    stops.length === 0
  ) {
    return (
      <EmptyState
        title="등록된 정류장이 없습니다"
        description="Supabase SQL Editor에서 schema.sql이 실행되었는지 확인해 주세요."
        action={
          <Button
            onClick={() => {
              void loadStops();
            }}
          >
            다시 불러오기
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          title="정류장 선택"
          description="현재 신고할 정류장을 선택하세요."
        />

        <div className="mt-5 overflow-hidden rounded-card border border-line">
          <KakaoMap
            center={mapCenter}
            markers={stopMarkers}
            level={5}
            height={300}
            onMarkerClick={handleMarkerClick}
          />
        </div>

        <p className="mt-3 text-xs leading-5 text-muted">
          지도 마커를 누르거나 아래 목록에서 정류장을
          선택할 수 있습니다.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-main">
              정류장
            </span>

            <select
              value={selectedStopId ?? ""}
              disabled={isLoadingStops}
              onChange={(event) => {
                setSelectedStopId(
                  Number(event.target.value),
                );
              }}
              className="min-h-12 w-full rounded-control border border-line bg-surface px-4 text-sm text-main outline-none focus:border-brand disabled:opacity-50"
            >
              {isLoadingStops && (
                <option value="">
                  정류장 불러오는 중...
                </option>
              )}

              {stops.map((stop) => (
                <option
                  key={stop.id}
                  value={stop.id}
                >
                  {stop.name}
                  {stop.stop_number
                    ? ` (${stop.stop_number})`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          {selectedStop && (
            <div className="rounded-control bg-surface-muted p-4">
              <p className="font-semibold text-main">
                {selectedStop.name}
              </p>

              <p className="mt-1 text-xs text-muted">
                {selectedStop.district_name ??
                  "행정동 미등록"}
                {selectedStop.stop_number
                  ? ` · 정류장 ${selectedStop.stop_number}`
                  : ""}
              </p>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-main">
              노선번호
              <span className="ml-1 font-normal text-muted">
                선택
              </span>
            </span>

            <input
              value={routeNumber}
              onChange={(event) => {
                setRouteNumber(
                  event.target.value,
                );
              }}
              maxLength={20}
              inputMode="text"
              placeholder="예: 56"
              className="min-h-12 w-full rounded-control border border-line bg-surface px-4 text-sm text-main outline-none placeholder:text-muted focus:border-brand"
            />
          </label>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="현재 위치 확인"
          description="위치는 거리 검증 후 즉시 폐기합니다."
          action={
            locationStatus === "ready" ? (
              <Badge variant="success">
                위치 확인됨
              </Badge>
            ) : locationStatus === "loading" ? (
              <Badge variant="info">
                확인 중
              </Badge>
            ) : (
              <Badge variant="warning">
                위치 필요
              </Badge>
            )
          }
        />

        <Button
          variant={
            locationStatus === "ready"
              ? "secondary"
              : "primary"
          }
          fullWidth
          disabled={
            locationStatus === "loading"
          }
          onClick={requestLocation}
          className="mt-5"
        >
          {locationStatus === "loading"
            ? "현재 위치 확인 중..."
            : locationStatus === "ready"
              ? "현재 위치 다시 확인"
              : "현재 위치 확인"}
        </Button>

        {message && (
          <p
            role={isError ? "alert" : "status"}
            className={[
              "mt-4 rounded-control px-4 py-3 text-sm leading-6",
              isError
                ? "bg-danger-soft text-danger"
                : "bg-success-soft text-success",
            ].join(" ")}
          >
            {message}
          </p>
        )}
      </Card>

      <Card>
        <SectionHeader
          title="원터치 익명 신고"
          description="해당하는 불편을 한 번만 눌러 주세요."
        />

        <div className="mt-5 space-y-3">
          {reportOptions.map((option) => (
            <button
              key={option.kind}
              type="button"
              disabled={
                submittingKind !== null
              }
              onClick={() => {
                void submitReport(option.kind);
              }}
              className={[
                "flex min-h-20 w-full items-center gap-4 rounded-card border p-4 text-left",
                "transition-transform active:scale-[0.99]",
                "disabled:cursor-not-allowed disabled:opacity-50",
                option.containerClass,
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className="text-2xl"
              >
                {option.icon}
              </span>

              <span className="min-w-0 flex-1">
                <strong className="block text-base">
                  {option.label}
                </strong>

                <span className="mt-1 block text-xs leading-5 opacity-80">
                  {option.description}
                </span>
              </span>

              <span className="text-sm font-semibold">
                {submittingKind === option.kind
                  ? "접수 중"
                  : "신고"}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <RealtimeSummary
        summaries={summaries}
      />
    </div>
  );
}

type RealtimeSummaryProps = {
  summaries: ReportSummary[];
};

function RealtimeSummary({
  summaries,
}: RealtimeSummaryProps) {
  const totals = reportOptions.map((option) => {
    const count = summaries
      .filter(
        (summary) =>
          summary.kind === option.kind,
      )
      .reduce(
        (sum, summary) =>
          sum + summary.report_count,
        0,
      );

    return {
      ...option,
      count,
    };
  });

  return (
    <Card>
      <SectionHeader
        title="정류장 실시간 현황"
        description="최근 10분간 익명 신고 집계"
        action={
          <Badge variant="info">
            실시간
          </Badge>
        }
      />

      <ul className="mt-5 space-y-3">
        {totals.map((item) => (
          <li
            key={item.kind}
            className="flex items-center justify-between rounded-control bg-surface-muted px-4 py-3"
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={
                  item.kind === "full_pass"
                    ? "text-danger"
                    : item.kind ===
                        "dispatch_delay"
                      ? "text-warning"
                      : "text-success"
                }
              >
              </span>

              <span className="text-sm font-medium text-main">
                {item.label}
              </span>
            </span>

            <strong className="text-sm text-main">
              {item.count}건
            </strong>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-5 text-muted">
        신고 데이터에는 사용자 ID, 기기 정보,
        현재 위치가 저장되지 않습니다.
      </p>
    </Card>
  );
}
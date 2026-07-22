"use client";

import {
  useCallback,
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
  Button,
  Card,
  EmptyState,
  ProgressBar,
  SectionHeader,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

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

type Coordinates = {
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

type ReportSuccess = {
  stopName: string;
  stopNumber: string | null;
  kind: ReportKind;
  routeNumber: string | null;
  reportedAt: string;
};

type LocationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "denied"
  | "unsupported"
  | "error";

const REPORT_RADIUS_METERS = 500;

const reportOptions = [
  {
    kind: "full_pass",
    label: "만차 통과",
    description:
      "버스가 가득 차 그냥 지나갔어요.",
    color:
      "border-danger bg-danger-soft text-danger",
    dot: "bg-danger",
  },
  {
    kind: "dispatch_delay",
    label: "배차 지연",
    description:
      "예정 시간보다 버스가 늦게 왔어요.",
    color:
      "border-warning bg-warning-soft text-warning",
    dot: "bg-warning",
  },
  {
    kind: "transfer_failure",
    label: "환승 실패",
    description:
      "연결편을 놓쳐 환승하지 못했어요.",
    color:
      "border-success bg-success-soft text-success",
    dot: "bg-success",
  },
] satisfies Array<{
  kind: ReportKind;
  label: string;
  description: string;
  color: string;
  dot: string;
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

  const [
    selectedStopId,
    setSelectedStopId,
  ] = useState<number | null>(null);

  const [search, setSearch] =
    useState("");

  const [coordinates, setCoordinates] =
    useState<Coordinates | null>(null);

  const [
    locationStatus,
    setLocationStatus,
  ] =
    useState<LocationStatus>("idle");

  const [routeNumber, setRouteNumber] =
    useState("");

  const [summaries, setSummaries] =
    useState<ReportSummary[]>([]);

  const [
    isLoadingStops,
    setIsLoadingStops,
  ] = useState(true);

  const [
    submittingKind,
    setSubmittingKind,
  ] = useState<ReportKind | null>(
    null,
  );

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const [success, setSuccess] =
    useState<ReportSuccess | null>(
      null,
    );

  const selectedStop =
    stops.find(
      (stop) =>
        stop.id === selectedStopId,
    ) ?? null;

  const filteredStops = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return stops;
    }

    return stops.filter((stop) => {
      const searchableText = [
        stop.name,
        stop.stop_number ?? "",
        stop.district_name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        keyword,
      );
    });
  }, [search, stops]);

  const mapMarkers =
    useMemo<MapMarkerData[]>(() => {
      const visibleStops =
        search.trim().length > 0
          ? filteredStops
          : stops;

      const markers: MapMarkerData[] =
        visibleStops.map((stop) => ({
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
          latitude:
            coordinates.latitude,
          longitude:
            coordinates.longitude,
          title: "현재 위치",
        });
      }

      return markers;
    }, [
      coordinates,
      filteredStops,
      search,
      stops,
    ]);

  const mapCenter = useMemo(() => {
    if (selectedStop) {
      return {
        latitude:
          selectedStop.latitude,
        longitude:
          selectedStop.longitude,
      };
    }

    if (coordinates) {
      return coordinates;
    }

    return {
      latitude: 37.1995,
      longitude: 127.0645,
    };
  }, [
    coordinates,
    selectedStop,
  ]);

  const loadStops =
    useCallback(async () => {
      setIsLoadingStops(true);

      const { data, error } =
        await supabase
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
          .limit(300);

      if (error) {
        setIsError(true);
        setMessage(
          "정류장 목록을 불러오지 못했습니다.",
        );
        setIsLoadingStops(false);
        return;
      }

      setStops(
        (data ?? []) as TransitStop[],
      );

      setIsLoadingStops(false);
    }, [supabase]);

  const loadSummary =
    useCallback(async () => {
      if (!selectedStopId) {
        setSummaries([]);
        return;
      }

      const { data, error } =
        await supabase
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
          .eq(
            "stop_id",
            selectedStopId,
          )
          .order("report_count", {
            ascending: false,
          });

      if (error) {
        return;
      }

      setSummaries(
        (data ?? []) as ReportSummary[],
      );
    }, [
      selectedStopId,
      supabase,
    ]);

  useEffect(() => {
    void loadStops();
  }, [loadStops]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!selectedStopId) {
      return;
    }

    const channel = supabase
      .channel(
        `stop-reports-${selectedStopId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table:
            "anonymous_reports",
          filter: `stop_id=eq.${selectedStopId}`,
        },
        () => {
          void loadSummary();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    loadSummary,
    selectedStopId,
    supabase,
  ]);

  function selectStop(
    stopId: number,
    announcement = true,
  ) {
    const stop =
      stops.find(
        (item) =>
          item.id === stopId,
      ) ?? null;

    setSelectedStopId(stopId);
    setIsError(false);

    if (announcement && stop) {
      setMessage(
        `${stop.name} 정류장을 선택했습니다.`,
      );
    }
  }

  function handleMarkerClick(
    marker: MapMarkerData,
  ) {
    if (
      marker.id ===
      "current-location"
    ) {
      setMessage(
        "현재 위치입니다. 신고할 정류장 마커를 선택해 주세요.",
      );
      setIsError(false);
      return;
    }

    selectStop(Number(marker.id));
  }

  function requestLocation() {
    setMessage("");
    setIsError(false);

    if (!navigator.geolocation) {
      setLocationStatus(
        "unsupported",
      );
      setIsError(true);
      setMessage(
        "이 브라우저는 위치 기능을 지원하지 않습니다.",
      );
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentCoordinates = {
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude,
        };

        setCoordinates(
          currentCoordinates,
        );
        setLocationStatus("ready");

        const nearest =
          findNearestStop(
            currentCoordinates,
            stops,
          );

        if (
          nearest &&
          nearest.distance <=
            REPORT_RADIUS_METERS
        ) {
          setSelectedStopId(
            nearest.stop.id,
          );

          setMessage(
            `현재 위치에서 가장 가까운 ${nearest.stop.name} 정류장을 선택했습니다.`,
          );
          return;
        }

        setMessage(
          "현재 위치를 확인했습니다. 지도나 검색 결과에서 신고할 정류장을 선택해 주세요.",
        );
      },
      (error) => {
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

    if (!selectedStop) {
      setIsError(true);
      setMessage(
        "신고할 정류장을 선택해 주세요.",
      );
      return;
    }

    if (!coordinates) {
      setIsError(true);
      setMessage(
        "신고 전에 현재 위치를 확인해 주세요.",
      );
      return;
    }

    const distance =
      calculateDistanceMeters(
        coordinates.latitude,
        coordinates.longitude,
        selectedStop.latitude,
        selectedStop.longitude,
      );

    if (
      distance >
      REPORT_RADIUS_METERS
    ) {
      setIsError(true);
      setMessage(
        `선택한 정류장까지 약 ${Math.round(distance)}m입니다. 정류장 반경 500m 안에서만 신고할 수 있습니다.`,
      );
      return;
    }

    setSubmittingKind(kind);

    const { error } =
      await supabase.rpc(
        "submit_anonymous_report",
        {
          p_stop_id:
            selectedStop.id,
          p_kind: kind,
          p_lat:
            coordinates.latitude,
          p_lng:
            coordinates.longitude,
          p_route_number:
            routeNumber.trim() ||
            null,
        },
      );

    setSubmittingKind(null);

    if (error) {
      setIsError(true);

      if (
        error.message.includes(
          "정류장 반경 500m",
        )
      ) {
        setMessage(
          "선택한 정류장 반경 500m 안에서만 신고할 수 있습니다.",
        );
        return;
      }

      setMessage(
        `신고를 접수하지 못했습니다: ${error.message}`,
      );
      return;
    }

    const reportedAt =
      new Date().toISOString();

    setSuccess({
      stopName: selectedStop.name,
      stopNumber:
        selectedStop.stop_number,
      kind,
      routeNumber:
        routeNumber.trim() || null,
      reportedAt,
    });

    setRouteNumber("");
    setMessage(
      `${reportLabels[kind]} 신고가 익명으로 접수되었습니다.`,
    );

    await loadSummary();
  }

  if (
    !isLoadingStops &&
    stops.length === 0
  ) {
    return (
      <EmptyState
        title="등록된 정류장이 없습니다"
        description="Supabase에 정류장 데이터를 먼저 등록해 주세요."
      />
    );
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <section className="space-y-6">
          <Card>
            <SectionHeader
              title="정류장 선택"
              description="검색하거나 지도 마커를 눌러 신고할 정류장을 지정하세요."
              action={
                <Badge variant="info">
                  반경 500m
                </Badge>
              }
            />

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-main">
                정류장 검색
              </span>

              <div className="relative">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />
                  <path d="m16 16 4 4" />
                </svg>

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="정류장 이름 또는 번호 검색"
                  className="min-h-12 w-full rounded-control border border-line bg-surface pl-12 pr-4 text-sm text-main outline-none placeholder:text-muted focus:border-info"
                />
              </div>
            </label>

            {search.trim() && (
              <div className="mt-3 max-h-56 overflow-y-auto rounded-control border border-line">
                {filteredStops.length >
                0 ? (
                  <ul className="divide-y divide-line-light">
                    {filteredStops
                      .slice(0, 20)
                      .map((stop) => (
                        <li
                          key={
                            stop.id
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              selectStop(
                                stop.id,
                              )
                            }
                            className={[
                              "flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left",
                              selectedStopId ===
                              stop.id
                                ? "bg-info-soft"
                                : "bg-surface hover:bg-surface-muted",
                            ].join(
                              " ",
                            )}
                          >
                            <span>
                              <strong className="block text-sm text-main">
                                {
                                  stop.name
                                }
                              </strong>

                              <span className="mt-1 block text-xs text-muted">
                                {stop.district_name ??
                                  "행정동 미등록"}
                                {stop.stop_number
                                  ? ` · ${stop.stop_number}`
                                  : ""}
                              </span>
                            </span>

                            {selectedStopId ===
                              stop.id && (
                              <Badge variant="info">
                                선택됨
                              </Badge>
                            )}
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="p-5 text-center text-sm text-muted">
                    검색 결과가
                    없습니다.
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 overflow-hidden rounded-card border border-line">
              <KakaoMap
                center={mapCenter}
                markers={mapMarkers}
                level={
                  selectedStop ? 4 : 6
                }
                height={360}
                onMarkerClick={
                  handleMarkerClick
                }
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-muted">
              지도에서 정류장 마커를 누르면
              해당 정류장이 신고 대상으로
              지정됩니다.
            </p>
          </Card>

          {selectedStop && (
            <SelectedStopCard
              stop={selectedStop}
              coordinates={
                coordinates
              }
            />
          )}

          <LiveSummary
            summaries={summaries}
            selectedStop={
              selectedStop
            }
          />
        </section>

        <aside className="space-y-6">
          <Card>
            <SectionHeader
              title="현재 위치 확인"
              description="GPS는 거리 검증에만 사용하고 저장하지 않습니다."
              action={
                locationStatus ===
                "ready" ? (
                  <Badge variant="success">
                    위치 확인됨
                  </Badge>
                ) : undefined
              }
            />

            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={
                locationStatus ===
                "loading"
              }
              onClick={
                requestLocation
              }
              className="mt-5"
            >
              {locationStatus ===
              "loading"
                ? "현재 위치 확인 중..."
                : "현재 위치 확인"}
            </Button>
          </Card>

          <Card>
            <SectionHeader
              title="원터치 익명 신고"
              description="불편 유형을 한 번 눌러 접수하세요."
              action={
                <Badge>
                  익명
                </Badge>
              }
            />

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-main">
                노선번호
                <span className="ml-1 font-normal text-muted">
                  선택
                </span>
              </span>

              <input
                value={routeNumber}
                maxLength={20}
                onChange={(event) =>
                  setRouteNumber(
                    event.target.value,
                  )
                }
                placeholder="예: 56"
                className="min-h-12 w-full rounded-control border border-line bg-surface px-4 text-sm text-main outline-none placeholder:text-muted focus:border-brand"
              />
            </label>

            <div className="mt-5 space-y-3">
              {reportOptions.map(
                (option) => (
                  <button
                    key={option.kind}
                    type="button"
                    disabled={
                      submittingKind !==
                      null
                    }
                    onClick={() =>
                      void submitReport(
                        option.kind,
                      )
                    }
                    className={[
                      "flex min-h-[76px] w-full items-center gap-4 rounded-card border p-4 text-left transition-transform active:scale-[0.99]",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      option.color,
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "size-5 shrink-0 rounded-pill",
                        option.dot,
                      ].join(" ")}
                    />

                    <span className="min-w-0">
                      <strong className="block text-base">
                        {submittingKind ===
                        option.kind
                          ? "접수 중..."
                          : option.label}
                      </strong>

                      <span className="mt-1 block text-xs leading-5 opacity-80">
                        {
                          option.description
                        }
                      </span>
                    </span>
                  </button>
                ),
              )}
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-muted">
              저장 정보: 정류장 ID · 접수
              시각 · 불편 유형
            </p>

            {message && (
              <p
                role={
                  isError
                    ? "alert"
                    : "status"
                }
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
        </aside>
      </div>

      {success && (
        <ReportSuccessModal
          success={success}
          onClose={() =>
            setSuccess(null)
          }
        />
      )}
    </>
  );
}

function SelectedStopCard({
  stop,
  coordinates,
}: {
  stop: TransitStop;
  coordinates: Coordinates | null;
}) {
  const distance = coordinates
    ? calculateDistanceMeters(
        coordinates.latitude,
        coordinates.longitude,
        stop.latitude,
        stop.longitude,
      )
    : null;

  const canReport =
    distance !== null &&
    distance <=
      REPORT_RADIUS_METERS;

  return (
    <Card
      className={
        canReport
          ? "border-success/30"
          : "border-info/20"
      }
    >
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-info-soft text-info">
          ●
        </span>

        <div className="min-w-0">
          <p className="text-xs font-semibold text-info">
            선택한 정류장
          </p>

          <h2 className="mt-1 truncate text-lg font-bold text-main">
            {stop.name}
          </h2>

          <p className="mt-1 text-sm text-muted">
            {stop.district_name ??
              "행정동 미등록"}
            {stop.stop_number
              ? ` · 정류장 ${stop.stop_number}`
              : ""}
          </p>
        </div>

        {distance !== null && (
          <Badge
            variant={
              canReport
                ? "success"
                : "warning"
            }
          >
            약 {Math.round(distance)}m
          </Badge>
        )}
      </div>

      {distance !== null && (
        <p
          className={[
            "mt-4 rounded-control px-4 py-3 text-sm",
            canReport
              ? "bg-success-soft text-success"
              : "bg-warning-soft text-warning",
          ].join(" ")}
        >
          {canReport
            ? "현재 위치에서 신고할 수 있는 정류장입니다."
            : "정류장 반경 500m 안으로 이동해야 신고할 수 있습니다."}
        </p>
      )}
    </Card>
  );
}

function LiveSummary({
  summaries,
  selectedStop,
}: {
  summaries: ReportSummary[];
  selectedStop: TransitStop | null;
}) {
  if (!selectedStop) {
    return (
      <EmptyState
        title="정류장을 선택해 주세요"
        description="선택한 정류장의 최근 10분 신고 현황이 여기에 표시됩니다."
      />
    );
  }

  const totals = reportOptions.map(
    (option) => {
      const count = summaries
        .filter(
          (summary) =>
            summary.kind ===
            option.kind,
        )
        .reduce(
          (sum, summary) =>
            sum +
            summary.report_count,
          0,
        );

      return {
        ...option,
        count,
      };
    },
  );

  const maximum = Math.max(
    ...totals.map(
      (item) => item.count,
    ),
    1,
  );

  const totalCount = totals.reduce(
    (sum, item) =>
      sum + item.count,
    0,
  );

  return (
    <Card>
      <SectionHeader
        title="정류장 실시간 현황"
        description={`${selectedStop.name} · 최근 10분`}
        action={
          <Badge variant="info">
            {totalCount}건
          </Badge>
        }
      />

      <div className="mt-6 space-y-5">
        {totals.map((item) => (
          <div
            key={item.kind}
            className="grid grid-cols-[92px_1fr_28px] items-center gap-3"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-main">
              <span
                className={[
                  "size-2.5 rounded-pill",
                  item.dot,
                ].join(" ")}
              />

              {item.label}
            </span>

            <ProgressBar
              value={
                (item.count /
                  maximum) *
                100
              }
              variant={
                item.kind ===
                "full_pass"
                  ? "danger"
                  : item.kind ===
                      "transfer_failure"
                    ? "success"
                    : "brand"
              }
            />

            <strong className="text-right text-sm text-main">
              {item.count}
            </strong>
          </div>
        ))}
      </div>

      {totalCount === 0 && (
        <p className="mt-5 rounded-control bg-surface-muted p-4 text-center text-sm text-muted">
          최근 10분 동안 접수된 신고가
          없습니다.
        </p>
      )}
    </Card>
  );
}

function ReportSuccessModal({
  success,
  onClose,
}: {
  success: ReportSuccess;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-success-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#191f28]/55 px-4 py-8 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-card bg-surface p-6 text-center shadow-floating sm:p-8">
        <span className="mx-auto flex size-20 items-center justify-center rounded-pill bg-danger text-xl font-bold text-white">
          접수
        </span>

        <h2
          id="report-success-title"
          className="mt-6 text-2xl font-bold text-main"
        >
          익명으로 접수되었습니다
        </h2>

        <p className="mt-3 text-sm leading-6 text-muted">
          신고해 주셔서 감사합니다.
          데이터는 교통 통계와 AI 분석에
          활용됩니다.
        </p>

        <dl className="mt-6 divide-y divide-line-light rounded-card border border-line bg-brand-softer px-5 text-left">
          <SuccessRow
            label="정류장"
            value={[
              success.stopName,
              success.stopNumber,
            ]
              .filter(Boolean)
              .join(" · ")}
          />

          <SuccessRow
            label="시간"
            value={formatDateTime(
              success.reportedAt,
            )}
          />

          <SuccessRow
            label="불편 유형"
            value={
              reportLabels[
                success.kind
              ]
            }
          />

          {success.routeNumber && (
            <SuccessRow
              label="노선"
              value={`${success.routeNumber}번`}
            />
          )}
        </dl>

        <div className="mt-6 rounded-control bg-info-soft px-4 py-3 text-xs leading-5 text-info">
          신고자의 이름과 GPS 좌표는
          신고 데이터에 저장하지 않습니다.
        </div>

        <Button
          type="button"
          fullWidth
          onClick={onClose}
          className="mt-6"
        >
          확인
        </Button>
      </div>
    </div>
  );
}

function SuccessRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3 py-4 text-sm">
      <dt className="text-muted">
        {label}
      </dt>

      <dd className="font-semibold text-main">
        {value}
      </dd>
    </div>
  );
}

function findNearestStop(
  coordinates: Coordinates,
  stops: TransitStop[],
) {
  let nearest:
    | {
        stop: TransitStop;
        distance: number;
      }
    | null = null;

  for (const stop of stops) {
    const distance =
      calculateDistanceMeters(
        coordinates.latitude,
        coordinates.longitude,
        stop.latitude,
        stop.longitude,
      );

    if (
      !nearest ||
      distance < nearest.distance
    ) {
      nearest = {
        stop,
        distance,
      };
    }
  }

  return nearest;
}

function calculateDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) {
  const earthRadius = 6371000;

  const latitudeDelta =
    toRadians(
      latitude2 - latitude1,
    );

  const longitudeDelta =
    toRadians(
      longitude2 - longitude1,
    );

  const firstLatitude =
    toRadians(latitude1);

  const secondLatitude =
    toRadians(latitude2);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(
        longitudeDelta / 2,
      ) **
        2;

  return (
    earthRadius *
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine),
    )
  );
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}
import type {
  Metadata,
} from "next";
import Link from "next/link";

import {
  Badge,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import {
  requireAdmin,
} from "@/lib/auth";
import {
  createClient,
} from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "관리자 교통 사건",
};

const PAGE_SIZE = 10;

type IncidentStatus =
  | "detected"
  | "reviewing"
  | "notified"
  | "resolved";

type IncidentSeverity =
  | "low"
  | "medium"
  | "high";

type ReportKind =
  | "full_pass"
  | "dispatch_delay"
  | "transfer_failure";

type SearchParams = {
  q?: string | string[];
  status?: string | string[];
  severity?: string | string[];
  kind?: string | string[];
  page?: string | string[];
};

type IncidentsPageProps = {
  searchParams: Promise<SearchParams>;
};

type Incident = {
  id: number;
  stop_id: number;
  kind: ReportKind;

  route_number:
    | string
    | null;

  report_count: number;
  severity: IncidentSeverity;
  status: IncidentStatus;

  ai_summary:
    | string
    | null;

  admin_recommendation:
    | string
    | null;

  requires_review: boolean;
  window_started_at: string;
  window_ended_at: string;
  created_at: string;
  updated_at: string;

  transit_stops:
    | {
        name: string;

        stop_number:
          | string
          | null;

        district_name:
          | string
          | null;
      }
    | {
        name: string;

        stop_number:
          | string
          | null;

        district_name:
          | string
          | null;
      }[]
    | null;
};

const reportLabels: Record<
  ReportKind,
  string
> = {
  full_pass:
    "만차 통과",

  dispatch_delay:
    "배차 지연",

  transfer_failure:
    "환승 실패",
};

export default async function AdminIncidentsPage({
  searchParams,
}: IncidentsPageProps) {
  await requireAdmin();

  const params =
    await searchParams;

  const keyword =
    readParam(
      params.q,
    ).trim();

  const status =
    parseStatus(
      readParam(
        params.status,
      ),
    );

  const severity =
    parseSeverity(
      readParam(
        params.severity,
      ),
    );

  const kind =
    parseKind(
      readParam(
        params.kind,
      ),
    );

  const page =
    parsePage(
      readParam(
        params.page,
      ),
    );

  const supabase =
    await createClient();

  let matchedStopIds:
    number[] | null = null;

  let stopSearchError =
    false;

  if (
    keyword &&
    !isPositiveInteger(
      keyword,
    )
  ) {
    const {
      data: stops,
      error: stopsError,
    } = await supabase
      .from("transit_stops")
      .select("id")
      .ilike(
        "name",
        `%${keyword}%`,
      )
      .limit(200);

    if (stopsError) {
      console.error(
        "[Incident stop search error]",
        stopsError,
      );

      stopSearchError =
        true;
    }

    matchedStopIds =
      (stops ?? []).map(
        (stop) =>
          stop.id,
      );
  }

  let query = supabase
    .from("incidents")
    .select(
      `
        id,
        stop_id,
        kind,
        route_number,
        report_count,
        severity,
        status,
        ai_summary,
        admin_recommendation,
        requires_review,
        window_started_at,
        window_ended_at,
        created_at,
        updated_at,
        transit_stops (
          name,
          stop_number,
          district_name
        )
      `,
      {
        count: "exact",
      },
    )
    .order("created_at", {
      ascending: false,
    });

  if (status) {
    query = query.eq(
      "status",
      status,
    );
  }

  if (severity) {
    query = query.eq(
      "severity",
      severity,
    );
  }

  if (kind) {
    query = query.eq(
      "kind",
      kind,
    );
  }

  if (keyword) {
    if (
      isPositiveInteger(
        keyword,
      )
    ) {
      query = query.eq(
        "id",
        Number(keyword),
      );
    } else if (
      matchedStopIds &&
      matchedStopIds.length > 0
    ) {
      query = query.in(
        "stop_id",
        matchedStopIds,
      );
    } else {
      // 검색 결과가 없는 경우 빈 결과 반환
      query = query.eq(
        "id",
        -1,
      );
    }
  }

  const rangeStart =
    (page - 1) *
    PAGE_SIZE;

  const rangeEnd =
    rangeStart +
    PAGE_SIZE -
    1;

  const [
    incidentsResult,
    detectedResult,
    reviewingResult,
    notifiedResult,
    resolvedResult,
  ] = await Promise.all([
    query.range(
      rangeStart,
      rangeEnd,
    ),

    supabase
      .from("incidents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "detected",
      ),

    supabase
      .from("incidents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "reviewing",
      ),

    supabase
      .from("incidents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "notified",
      ),

    supabase
      .from("incidents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "resolved",
      ),
  ]);

  const incidents =
    (incidentsResult.data ??
      []) as Incident[];

  const totalCount =
    incidentsResult.count ??
    0;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalCount /
          PAGE_SIZE,
      ),
    );

  const hasError =
    stopSearchError ||
    Boolean(
      incidentsResult.error,
    ) ||
    Boolean(
      detectedResult.error,
    ) ||
    Boolean(
      reviewingResult.error,
    ) ||
    Boolean(
      notifiedResult.error,
    ) ||
    Boolean(
      resolvedResult.error,
    );

  const currentFilters = {
    q: keyword,
    status:
      status ?? "",
    severity:
      severity ?? "",
    kind:
      kind ?? "",
  };

  return (
    <div className="space-y-7">
      <header>
        <Badge variant="danger">
          실시간 교통
        </Badge>

        <h1 className="mt-3 text-2xl font-bold text-main sm:text-3xl">
          교통 사건 관리
        </h1>

        <p className="mt-2 text-sm leading-6 text-secondary">
          시민 익명 신고를 기반으로
          감지된 교통 사건을 검색하고
          상태별로 관리합니다.
        </p>
      </header>

      <section
        aria-label="교통 사건 현황"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatusSummary
          label="분석 대기"
          value={
            detectedResult.count ??
            0
          }
          variant="brand"
          href={buildFilterHref({
            status:
              "detected",
          })}
          active={
            status ===
            "detected"
          }
        />

        <StatusSummary
          label="관리자 검토"
          value={
            reviewingResult.count ??
            0
          }
          variant="warning"
          href={buildFilterHref({
            status:
              "reviewing",
          })}
          active={
            status ===
            "reviewing"
          }
        />

        <StatusSummary
          label="시민 안내"
          value={
            notifiedResult.count ??
            0
          }
          variant="info"
          href={buildFilterHref({
            status:
              "notified",
          })}
          active={
            status ===
            "notified"
          }
        />

        <StatusSummary
          label="해결 완료"
          value={
            resolvedResult.count ??
            0
          }
          variant="success"
          href={buildFilterHref({
            status:
              "resolved",
          })}
          active={
            status ===
            "resolved"
          }
        />
      </section>

      <Card>
        <SectionHeader
          title="사건 검색 및 필터"
          description="정류장명이나 사건 번호로 검색할 수 있습니다."
        />

        <form
          method="get"
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-12"
        >
          <div className="md:col-span-2 xl:col-span-4">
            <label
              htmlFor="incident-search"
              className="text-xs font-bold text-secondary"
            >
              사건 검색
            </label>

            <input
              id="incident-search"
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="정류장명 또는 사건 번호"
              className="mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-4 text-sm text-main outline-none transition-colors placeholder:text-muted focus:border-brand"
            />
          </div>

          <div className="xl:col-span-2">
            <FilterSelect
              id="incident-status"
              name="status"
              label="처리 상태"
              defaultValue={status ?? ""}
            >
              <option value="">전체 상태</option>
              <option value="detected">감지됨</option>
              <option value="reviewing">검토 중</option>
              <option value="notified">시민 안내</option>
              <option value="resolved">해결 완료</option>
            </FilterSelect>
          </div>

          <div className="xl:col-span-2">
            <FilterSelect
              id="incident-severity"
              name="severity"
              label="위험도"
              defaultValue={severity ?? ""}
            >
              <option value="">전체 위험도</option>
              <option value="high">긴급</option>
              <option value="medium">주의</option>
              <option value="low">일반</option>
            </FilterSelect>
          </div>

          <div className="xl:col-span-2">
            <FilterSelect
              id="incident-kind"
              name="kind"
              label="신고 유형"
              defaultValue={kind ?? ""}
            >
              <option value="">전체 유형</option>
              <option value="full_pass">만차 통과</option>
              <option value="dispatch_delay">배차 지연</option>
              <option value="transfer_failure">환승 실패</option>
            </FilterSelect>
          </div>

          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-2">
            <button
              type="submit"
              className="inline-flex min-h-11 flex-1 whitespace-nowrap items-center justify-center rounded-control bg-brand px-4 text-sm font-bold text-on-brand transition-colors hover:bg-brand-hover"
            >
              검색
            </button>

            <Link
              href="/admin/incidents"
              className="inline-flex min-h-11 flex-1 whitespace-nowrap items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold text-secondary transition-colors hover:bg-surface-muted"
            >
              초기화
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        <SectionHeader
          title="감지된 교통 사건"
          description={
            hasActiveFilter(
              currentFilters,
            )
              ? "검색 및 필터 결과입니다."
              : "최근 생성된 사건부터 표시됩니다."
          }
          action={
            <Badge variant="info">
              총{" "}
              {totalCount.toLocaleString()}
              건
            </Badge>
          }
        />

        {hasError ? (
          <div
            role="alert"
            className="mt-5 rounded-control border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
          >
            교통 사건 목록을
            불러오지 못했습니다.
          </div>
        ) : incidents.length ===
          0 ? (
          <div className="mt-5">
            <EmptyState
              title="조건에 맞는 교통 사건이 없습니다."
              description="검색어 또는 필터 조건을 변경해 주세요."
              action={
                <Link
                  href="/admin/incidents"
                  className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand px-5 text-sm font-bold text-on-brand"
                >
                  전체 사건 보기
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {incidents.map(
              (incident) => (
                <IncidentItem
                  key={
                    incident.id
                  }
                  incident={
                    incident
                  }
                />
              ),
            )}
          </ul>
        )}

        {totalPages > 1 && (
          <Pagination
            currentPage={
              page
            }
            totalPages={
              totalPages
            }
            filters={
              currentFilters
            }
          />
        )}
      </Card>

      <p className="text-center text-xs leading-5 text-muted">
        사건은 시민 안내가 승인되기
        전에도 관리자 목록에 표시됩니다.
      </p>
    </div>
  );
}

function FilterSelect({
  id,
  name,
  label,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-xs font-bold text-secondary"
      >
        {label}
      </label>

      <select
        id={id}
        name={name}
        defaultValue={
          defaultValue
        }
        className="mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-main outline-none focus:border-brand"
      >
        {children}
      </select>
    </div>
  );
}

function IncidentItem({
  incident,
}: {
  incident: Incident;
}) {
  const stop =
    Array.isArray(
      incident.transit_stops,
    )
      ? incident
          .transit_stops[0]
      : incident.transit_stops;

  return (
    <li>
      <Link
        href={`/admin/incidents/${incident.id}`}
        className="block rounded-card border border-line p-5 transition-colors hover:border-brand-line hover:bg-brand-softer"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge
                severity={
                  incident.severity
                }
              />

              <StatusBadge
                status={
                  incident.status
                }
              />

              {incident.requires_review && (
                <Badge variant="warning">
                  관리자 검토 필요
                </Badge>
              )}
            </div>

            <h2 className="mt-3 truncate text-lg font-bold text-main">
              {stop?.name ??
                "정류장 정보 없음"}
            </h2>

            <p className="mt-1 text-sm text-secondary">
              {stop?.stop_number ??
                "정류장 번호 없음"}

              {stop?.district_name
                ? ` · ${stop.district_name}`
                : ""}
            </p>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <p className="text-xs text-muted">
              사건 번호
            </p>

            <p className="mt-1 font-bold text-main">
              #{incident.id}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-control bg-surface-muted p-4 sm:grid-cols-3">
          <IncidentInfo
            label="신고 유형"
            value={
              reportLabels[
                incident.kind
              ]
            }
          />

          <IncidentInfo
            label="노선"
            value={
              incident.route_number ??
              "노선 미지정"
            }
          />

          <IncidentInfo
            label="신고 건수"
            value={`${incident.report_count}건`}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted">
              AI 분석 결과
            </p>

            <p className="mt-1 line-clamp-2 text-sm leading-6 text-secondary">
              {incident.ai_summary ??
                incident.admin_recommendation ??
                "아직 AI 분석을 실행하지 않았습니다."}
            </p>
          </div>

          <span className="shrink-0 text-sm font-semibold text-brand-text">
            사건 상세보기 →
          </span>
        </div>

        <p className="mt-3 text-xs text-muted">
          최근 신고{" "}
          {formatDateTime(
            incident.window_ended_at,
          )}
        </p>
      </Link>
    </li>
  );
}

function StatusSummary({
  label,
  value,
  variant,
  href,
  active,
}: {
  label: string;
  value: number;

  variant:
    | "brand"
    | "warning"
    | "info"
    | "success";

  href: string;
  active: boolean;
}) {
  const colors = {
    brand:
      "border-brand-line bg-brand-softer text-brand-text",

    warning:
      "border-warning/30 bg-warning-soft text-warning",

    info:
      "border-info/30 bg-info-soft text-info",

    success:
      "border-success/30 bg-success-soft text-success",
  };

  return (
    <Link
      href={href}
      aria-current={
        active
          ? "page"
          : undefined
      }
      className={[
        "rounded-card border p-5 transition-transform hover:-translate-y-0.5",
        colors[variant],
        active
          ? "ring-2 ring-brand ring-offset-2"
          : "",
      ].join(" ")}
    >
      <p className="text-sm font-semibold">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value.toLocaleString()}

        <span className="ml-1 text-sm">
          건
        </span>
      </p>
    </Link>
  );
}

function IncidentInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-main">
        {value}
      </p>
    </div>
  );
}

function SeverityBadge({
  severity,
}: {
  severity:
    IncidentSeverity;
}) {
  if (
    severity === "high"
  ) {
    return (
      <Badge variant="danger">
        긴급
      </Badge>
    );
  }

  if (
    severity === "medium"
  ) {
    return (
      <Badge variant="warning">
        주의
      </Badge>
    );
  }

  return (
    <Badge variant="info">
      일반
    </Badge>
  );
}

function StatusBadge({
  status,
}: {
  status:
    IncidentStatus;
}) {
  if (
    status === "resolved"
  ) {
    return (
      <Badge variant="success">
        해결 완료
      </Badge>
    );
  }

  if (
    status === "notified"
  ) {
    return (
      <Badge variant="info">
        시민 안내
      </Badge>
    );
  }

  if (
    status === "reviewing"
  ) {
    return (
      <Badge variant="warning">
        검토 중
      </Badge>
    );
  }

  return (
    <Badge variant="brand">
      감지됨
    </Badge>
  );
}

function Pagination({
  currentPage,
  totalPages,
  filters,
}: {
  currentPage: number;
  totalPages: number;

  filters: {
    q: string;
    status: string;
    severity: string;
    kind: string;
  };
}) {
  const startPage =
    Math.max(
      1,
      currentPage - 2,
    );

  const endPage =
    Math.min(
      totalPages,
      startPage + 4,
    );

  const pages =
    Array.from(
      {
        length:
          endPage -
          startPage +
          1,
      },
      (
        _,
        index,
      ) =>
        startPage +
        index,
    );

  return (
    <nav
      aria-label="사건 목록 페이지"
      className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-line pt-5"
    >
      <PageLink
        page={
          Math.max(
            1,
            currentPage - 1,
          )
        }
        filters={
          filters
        }
        disabled={
          currentPage === 1
        }
      >
        이전
      </PageLink>

      {pages.map(
        (page) => (
          <PageLink
            key={page}
            page={page}
            filters={
              filters
            }
            active={
              page ===
              currentPage
            }
          >
            {page}
          </PageLink>
        ),
      )}

      <PageLink
        page={
          Math.min(
            totalPages,
            currentPage + 1,
          )
        }
        filters={
          filters
        }
        disabled={
          currentPage ===
          totalPages
        }
      >
        다음
      </PageLink>
    </nav>
  );
}

function PageLink({
  page,
  filters,
  active = false,
  disabled = false,
  children,
}: {
  page: number;

  filters: {
    q: string;
    status: string;
    severity: string;
    kind: string;
  };

  active?: boolean;
  disabled?: boolean;
  children:
    React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex min-h-10 min-w-10 cursor-not-allowed items-center justify-center rounded-control border border-line px-3 text-sm text-muted opacity-50">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={buildPageHref({
        ...filters,
        page,
      })}
      aria-current={
        active
          ? "page"
          : undefined
      }
      className={[
        "inline-flex min-h-10 min-w-10 items-center justify-center rounded-control border px-3 text-sm font-semibold transition-colors",
        active
          ? "border-brand bg-brand text-on-brand"
          : "border-line bg-surface text-secondary hover:border-brand-line hover:bg-brand-softer",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function readParam(
  value:
    | string
    | string[]
    | undefined,
) {
  if (
    Array.isArray(value)
  ) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePage(
  value: string,
) {
  const page =
    Number(value);

  if (
    !Number.isInteger(
      page,
    ) ||
    page < 1
  ) {
    return 1;
  }

  return page;
}

function parseStatus(
  value: string,
): IncidentStatus | null {
  if (
    value === "detected" ||
    value === "reviewing" ||
    value === "notified" ||
    value === "resolved"
  ) {
    return value;
  }

  return null;
}

function parseSeverity(
  value: string,
): IncidentSeverity | null {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high"
  ) {
    return value;
  }

  return null;
}

function parseKind(
  value: string,
): ReportKind | null {
  if (
    value ===
      "full_pass" ||
    value ===
      "dispatch_delay" ||
    value ===
      "transfer_failure"
  ) {
    return value;
  }

  return null;
}

function isPositiveInteger(
  value: string,
) {
  return (
    /^\d+$/.test(
      value,
    ) &&
    Number(value) > 0
  );
}

function hasActiveFilter(
  filters: {
    q: string;
    status: string;
    severity: string;
    kind: string;
  },
) {
  return Boolean(
    filters.q ||
      filters.status ||
      filters.severity ||
      filters.kind,
  );
}

function buildFilterHref({
  status,
}: {
  status:
    IncidentStatus;
}) {
  return `/admin/incidents?status=${status}`;
}

function buildPageHref({
  q,
  status,
  severity,
  kind,
  page,
}: {
  q: string;
  status: string;
  severity: string;
  kind: string;
  page: number;
}) {
  const params =
    new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (status) {
    params.set(
      "status",
      status,
    );
  }

  if (severity) {
    params.set(
      "severity",
      severity,
    );
  }

  if (kind) {
    params.set(
      "kind",
      kind,
    );
  }

  if (page > 1) {
    params.set(
      "page",
      String(page),
    );
  }

  const query =
    params.toString();

  return query
    ? `/admin/incidents?${query}`
    : "/admin/incidents";
}

function formatDateTime(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "시간 정보 없음";
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}
import type {
  ReactNode,
} from "react";

import {
  Badge,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import {
  createClient,
} from "@/lib/supabase/server";

type ReportKind =
  | "full_pass"
  | "dispatch_delay"
  | "transfer_failure";

type SourceReport = {
  id: number;
  kind: ReportKind;
  route_number:
    | string
    | null;
  occurred_at: string;
  created_at: string;
};

type AdminIncidentSourceReportsProps = {
  stopId: number;
  kind: ReportKind;
  routeNumber:
    | string
    | null;
  windowStartedAt: string;
  windowEndedAt: string;
};

const reportLabels = {
  full_pass:
    "만차 통과",
  dispatch_delay:
    "배차 지연",
  transfer_failure:
    "환승 실패",
} as const;

export async function AdminIncidentSourceReports({
  stopId,
  kind,
  routeNumber,
  windowStartedAt,
  windowEndedAt,
}: AdminIncidentSourceReportsProps) {
  const supabase =
    await createClient();

  let query = supabase
    .from("anonymous_reports")
    .select(
      `
        id,
        kind,
        route_number,
        occurred_at,
        created_at
      `,
    )
    .eq(
      "stop_id",
      stopId,
    )
    .eq("kind", kind)
    .gte(
      "occurred_at",
      windowStartedAt,
    )
    .lte(
      "occurred_at",
      windowEndedAt,
    )
    .order("occurred_at", {
      ascending: true,
    })
    .limit(100);

  if (routeNumber) {
    query = query.eq(
      "route_number",
      routeNumber,
    );
  } else {
    query = query.is(
      "route_number",
      null,
    );
  }

  const {
    data,
    error,
  } = await query;

  const reports =
    (data ?? []) as SourceReport[];

  return (
    <Card>
      <SectionHeader
        title="사건 근거 신고"
        description="해당 사건의 정류장·유형·집계 시간과 일치하는 익명 신고입니다."
        action={
          <Badge variant="brand">
            {reports.length}
            건
          </Badge>
        }
      />

      <div className="mt-5 rounded-control border border-brand-line bg-brand-softer px-4 py-3">
        <p className="text-xs leading-5 text-secondary">
          원터치 신고는 개인정보와
          사용자 위치를 저장하지
          않습니다. 아래에는 익명 신고
          번호와 접수 시각만 표시됩니다.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-control border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          사건의 근거 신고를
          불러오지 못했습니다.
        </div>
      ) : reports.length ===
        0 ? (
        <div className="mt-5">
          <EmptyState
            title="일치하는 근거 신고가 없습니다."
            description="테스트 사건을 직접 생성했거나 원본 신고가 삭제된 경우 목록이 비어 있을 수 있습니다."
          />
        </div>
      ) : (
        <div className="mt-5 max-h-[360px] overflow-y-auto rounded-card border border-line">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-surface-muted">
              <tr>
                <TableHeader>
                  신고 번호
                </TableHeader>

                <TableHeader>
                  신고 유형
                </TableHeader>

                <TableHeader>
                  노선
                </TableHeader>

                <TableHeader>
                  접수 시각
                </TableHeader>
              </tr>
            </thead>

            <tbody>
              {reports.map(
                (
                  report,
                  index,
                ) => (
                  <tr
                    key={
                      report.id
                    }
                    className={[
                      "border-t border-line",
                      index % 2 === 0
                        ? "bg-surface"
                        : "bg-surface-muted/40",
                    ].join(" ")}
                  >
                    <TableCell>
                      <span className="font-semibold text-main">
                        #
                        {
                          report.id
                        }
                      </span>
                    </TableCell>

                    <TableCell>
                      <ReportKindBadge
                        kind={
                          report.kind
                        }
                      />
                    </TableCell>

                    <TableCell>
                      {report.route_number ??
                        "노선 미지정"}
                    </TableCell>

                    <TableCell>
                      {formatDateTime(
                        report.occurred_at,
                      )}
                    </TableCell>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-control bg-surface-muted p-4">
          <dt className="text-xs text-muted">
            사건 집계 시작
          </dt>

          <dd className="mt-1 text-sm font-semibold text-main">
            {formatDateTime(
              windowStartedAt,
            )}
          </dd>
        </div>

        <div className="rounded-control bg-surface-muted p-4">
          <dt className="text-xs text-muted">
            사건 집계 종료
          </dt>

          <dd className="mt-1 text-sm font-semibold text-main">
            {formatDateTime(
              windowEndedAt,
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function TableHeader({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-xs font-bold text-secondary"
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <td className="px-4 py-3 text-sm text-secondary">
      {children}
    </td>
  );
}

function ReportKindBadge({
  kind,
}: {
  kind: ReportKind;
}) {
  if (
    kind === "full_pass"
  ) {
    return (
      <Badge variant="danger">
        {
          reportLabels[
            kind
          ]
        }
      </Badge>
    );
  }

  if (
    kind ===
    "dispatch_delay"
  ) {
    return (
      <Badge variant="warning">
        {
          reportLabels[
            kind
          ]
        }
      </Badge>
    );
  }

  return (
    <Badge variant="info">
      {
        reportLabels[
          kind
        ]
      }
    </Badge>
  );
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
      second: "2-digit",
    },
  ).format(date);
}
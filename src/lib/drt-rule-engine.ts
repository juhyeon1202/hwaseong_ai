import "server-only";

export const DRT_RULE_CONFIG = {
  radiusKm: 2.5,
  timeWindowMinutes: 30,
  minimumReportCount: 5,
  highReportCount: 10,
  minimumIncidentCount: 1,
} as const;

type IncidentKind =
  | "full_pass"
  | "dispatch_delay"
  | "transfer_failure";

type IncidentSeverity =
  | "low"
  | "medium"
  | "high";

export type NearbyIncidentInput = {
  id: number;
  kind: IncidentKind;
  severity: IncidentSeverity;
  reportCount: number;
  distanceKm: number;
  occurredAt: string;
};

export type DrtRuleInput = {
  centerStopId: number;
  centerStopName: string;
  latitude: number;
  longitude: number;
  nearbyIncidents:
    NearbyIncidentInput[];
};

export type DrtRuleResult = {
  eligible: boolean;
  score: number;
  level:
    | "none"
    | "review"
    | "priority";
  title: string;
  reason: string;
  conditions: {
    reportTypeMatched: boolean;
    minimumReportsMatched: boolean;
    repeatedIncidentsMatched: boolean;
    severityMatched: boolean;
  };
  evidence: {
    centerStopId: number;
    centerStopName: string;
    latitude: number;
    longitude: number;
    radiusKm: number;
    timeWindowMinutes: number;
    incidentCount: number;
    totalReportCount: number;
    maximumSeverity:
      | "low"
      | "medium"
      | "high";
    incidentIds: number[];
  };
};

export function evaluateDrtRule(
  input: DrtRuleInput,
): DrtRuleResult {
  const relevantIncidents =
    input.nearbyIncidents.filter(
      (incident) =>
        incident.distanceKm <=
          DRT_RULE_CONFIG.radiusKm &&
        (
          incident.kind ===
            "full_pass" ||
          incident.kind ===
            "dispatch_delay"
        ),
    );

  const totalReportCount =
    relevantIncidents.reduce(
      (
        sum,
        incident,
      ) =>
        sum +
        incident.reportCount,
      0,
    );

  const maximumSeverity =
    getMaximumSeverity(
      relevantIncidents.map(
        (incident) =>
          incident.severity,
      ),
    );

  const conditions = {
    reportTypeMatched:
      relevantIncidents.length >
      0,

    minimumReportsMatched:
      totalReportCount >=
      DRT_RULE_CONFIG.minimumReportCount,

    repeatedIncidentsMatched:
      relevantIncidents.length >=
      DRT_RULE_CONFIG.minimumIncidentCount,

    severityMatched:
      maximumSeverity ===
        "medium" ||
      maximumSeverity ===
        "high" ||
      totalReportCount >=
        DRT_RULE_CONFIG.highReportCount,
  };

  let score = 0;

  if (
    conditions.reportTypeMatched
  ) {
    score += 25;
  }

  if (
    conditions.minimumReportsMatched
  ) {
    score += 30;
  }

  if (
    conditions.repeatedIncidentsMatched
  ) {
    score += 20;
  }

  if (
    conditions.severityMatched
  ) {
    score += 25;
  }

  const eligible =
    conditions.reportTypeMatched &&
    conditions.minimumReportsMatched &&
    conditions.repeatedIncidentsMatched;

  const level:
    | "none"
    | "review"
    | "priority" =
    !eligible
      ? "none"
      : score >= 90
        ? "priority"
        : "review";

  const reason =
    createReason({
      eligible,
      incidentCount:
        relevantIncidents.length,
      totalReportCount,
      maximumSeverity,
    });

  return {
    eligible,
    score,
    level,

    title:
      level === "priority"
        ? "똑버스 우선 호출 검토"
        : level === "review"
          ? "똑버스 호출 검토"
          : "똑버스 검토 조건 미충족",

    reason,
    conditions,

    evidence: {
      centerStopId:
        input.centerStopId,

      centerStopName:
        input.centerStopName,

      latitude:
        input.latitude,

      longitude:
        input.longitude,

      radiusKm:
        DRT_RULE_CONFIG.radiusKm,

      timeWindowMinutes:
        DRT_RULE_CONFIG.timeWindowMinutes,

      incidentCount:
        relevantIncidents.length,

      totalReportCount,

      maximumSeverity,

      incidentIds:
        relevantIncidents.map(
          (incident) =>
            incident.id,
        ),
    },
  };
}

function createReason({
  eligible,
  incidentCount,
  totalReportCount,
  maximumSeverity,
}: {
  eligible: boolean;
  incidentCount: number;
  totalReportCount: number;
  maximumSeverity:
    | "low"
    | "medium"
    | "high";
}) {
  if (!eligible) {
    return [
      `반경 ${DRT_RULE_CONFIG.radiusKm}km 이내 최근`,
      `${DRT_RULE_CONFIG.timeWindowMinutes}분간`,
      "만차 또는 배차 지연 신고가",
      "똑버스 검토 기준에 도달하지 않았습니다.",
    ].join(" ");
  }

  return [
    `반경 ${DRT_RULE_CONFIG.radiusKm}km 이내에서`,
    `${incidentCount}개의 관련 사건과`,
    `총 ${totalReportCount}건의 신고가 확인되었습니다.`,
    `최대 위험도는 ${getSeverityLabel(maximumSeverity)}이며`,
    "관리자의 똑버스 호출 검토가 필요합니다.",
  ].join(" ");
}

function getMaximumSeverity(
  values: IncidentSeverity[],
): IncidentSeverity {
  if (
    values.includes("high")
  ) {
    return "high";
  }

  if (
    values.includes("medium")
  ) {
    return "medium";
  }

  return "low";
}

function getSeverityLabel(
  severity: IncidentSeverity,
) {
  if (
    severity === "high"
  ) {
    return "높음";
  }

  if (
    severity === "medium"
  ) {
    return "보통";
  }

  return "낮음";
}
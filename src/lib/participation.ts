import "server-only";

import { createClient } from "@/lib/supabase/server";

type ParticipationQueryRow = {
  district_name: string;
  report_count: number;
  active_stop_count: number;
  latest_report_at: string | null;
};

export type ParticipationRanking = {
  rank: number;
  districtName: string;
  reportCount: number;
  activeStopCount: number;
  participation: number;
  latestReportAt: string | null;
};

const fallbackRows: ParticipationQueryRow[] = [
  {
    district_name: "동탄1동",
    report_count: 72,
    active_stop_count: 8,
    latest_report_at: null,
  },
  {
    district_name: "동탄2동",
    report_count: 61,
    active_stop_count: 6,
    latest_report_at: null,
  },
  {
    district_name: "병점2동",
    report_count: 55,
    active_stop_count: 5,
    latest_report_at: null,
  },
  {
    district_name: "병점1동",
    report_count: 48,
    active_stop_count: 4,
    latest_report_at: null,
  },
  {
    district_name: "봉담읍",
    report_count: 42,
    active_stop_count: 4,
    latest_report_at: null,
  },
  {
    district_name: "진안동",
    report_count: 33,
    active_stop_count: 3,
    latest_report_at: null,
  },
  {
    district_name: "향남읍",
    report_count: 29,
    active_stop_count: 3,
    latest_report_at: null,
  },
];

export async function getParticipationRanking(): Promise<
  ParticipationRanking[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("district_participation_7d")
    .select(
      `
        district_name,
        report_count,
        active_stop_count,
        latest_report_at
      `,
    )
    .order("report_count", {
      ascending: false,
    });

  const rows =
    !error && data && data.length > 0
      ? (data as ParticipationQueryRow[])
      : fallbackRows;

  const maximumCount = Math.max(
    ...rows.map(
      (row) => row.report_count,
    ),
    1,
  );

  return rows.map((row, index) => ({
    rank: index + 1,
    districtName: row.district_name,
    reportCount: row.report_count,
    activeStopCount:
      row.active_stop_count,
    participation: Math.max(
      1,
      Math.round(
        (row.report_count /
          maximumCount) *
          100,
      ),
    ),
    latestReportAt:
      row.latest_report_at,
  }));
}

export async function getHomeDistrict(
  userId: string | null,
) {
  if (!userId) {
    return null;
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("home_district")
    .eq("id", userId)
    .maybeSingle();

  return data?.home_district ?? null;
}
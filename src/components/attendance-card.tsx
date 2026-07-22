"use client";

import {
  useActionState,
} from "react";

import {
  checkAttendance,
  type AttendanceActionState,
} from "@/app/(protected)/mypage/actions";
import {
  Badge,
  Button,
  Card,
  ProgressBar,
  SectionHeader,
} from "@/components/ui";

type AttendanceCardProps = {
  attendedToday: boolean;
  currentStreak: number;
  attendanceDates: string[];
};

const initialState: AttendanceActionState = {
  status: "idle",
  message: "",
};

export function AttendanceCard({
  attendedToday,
  currentStreak,
  attendanceDates,
}: AttendanceCardProps) {
  const [state, formAction, isPending] =
    useActionState(
      checkAttendance,
      initialState,
    );

  const attendanceCompleted =
    attendedToday ||
    state.status === "success";

  const displayedStreak =
    state.streak ?? currentStreak;

  const progress =
    Math.min(
      100,
      (displayedStreak % 7) *
        (100 / 7),
    );

  const daysUntilBonus =
    displayedStreak % 7 === 0 &&
    displayedStreak > 0
      ? 7
      : 7 -
        (displayedStreak % 7);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader
          title="매일 출석"
          description="매일 출석하면 5P를 받을 수 있습니다."
        />

        <Badge
          variant={
            attendanceCompleted
              ? "success"
              : "brand"
          }
        >
          {attendanceCompleted
            ? "오늘 출석 완료"
            : "출석 가능"}
        </Badge>
      </div>

      <div className="mt-5 rounded-control bg-brand-softer p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted">
              연속 출석
            </p>

            <p className="mt-1 text-2xl font-bold text-brand-text">
              {displayedStreak}일
            </p>
          </div>

          <p className="text-right text-xs leading-5 text-muted">
            {daysUntilBonus}일 후
            <br />
            보너스 10P
          </p>
        </div>

        <div className="mt-4">
          <ProgressBar
            value={progress}
            variant="brand"
          />
        </div>
      </div>

      <AttendanceWeek
        attendanceDates={
          attendanceDates
        }
      />

      {state.message && (
        <p
          role="status"
          className={[
            "mt-4 rounded-control p-3 text-sm",
            state.status === "success"
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger",
          ].join(" ")}
        >
          {state.message}
        </p>
      )}

      <form
        action={formAction}
        className="mt-5"
      >
        <Button
          type="submit"
          fullWidth
          disabled={
            isPending ||
            attendanceCompleted
          }
        >
          {isPending
            ? "출석 처리 중..."
            : attendanceCompleted
              ? "오늘 출석 완료"
              : "오늘 출석하고 5P 받기"}
        </Button>
      </form>
    </Card>
  );
}

type AttendanceWeekProps = {
  attendanceDates: string[];
};

function AttendanceWeek({
  attendanceDates,
}: AttendanceWeekProps) {
  const attendedSet = new Set(
    attendanceDates,
  );

  const days = Array.from(
    {
      length: 7,
    },
    (_, index) => {
      const date = new Date();

      date.setDate(
        date.getDate() -
          (6 - index),
      );

      return {
        key: formatDateKey(date),
        label:
          new Intl.DateTimeFormat(
            "ko-KR",
            {
              weekday: "short",
            },
          ).format(date),
        day: date.getDate(),
      };
    },
  );

  return (
    <div className="mt-5 grid grid-cols-7 gap-1">
      {days.map((day) => {
        const attended =
          attendedSet.has(day.key);

        return (
          <div
            key={day.key}
            className="text-center"
          >
            <p className="text-[11px] text-muted">
              {day.label}
            </p>

            <div
              className={[
                "mx-auto mt-2 flex size-9 items-center justify-center rounded-pill text-xs font-semibold",
                attended
                  ? "bg-brand text-on-brand"
                  : "bg-surface-muted text-muted",
              ].join(" ")}
            >
              {attended
                ? "✓"
                : day.day}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDateKey(
  date: Date,
) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
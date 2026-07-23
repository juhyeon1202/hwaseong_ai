"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type JournalActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

type TravelMode =
  | "walk"
  | "bus"
  | "subway"
  | "taxi"
  | "drt"
  | "other";

type Sentiment =
  | "satisfied"
  | "dissatisfied";

type SegmentInput = {
  segmentOrder: number;
  mode: TravelMode;
  routeNumber: string;
  durationMinutes: number;
  originLabel: string;
  destinationLabel: string;
  sentiment: Sentiment;
  reasonCodes: string[];
  memo: string;
  guidance?: string;
  distance?: number;
};

type JournalInput = {
  category:
    | "commute"
    | "return"
    | "school"
    | "other";
  originLabel: string;
  destinationLabel: string;
  durationMinutes: number;
  routePayload: unknown;
  segments: SegmentInput[];
};

const validCategories = new Set([
  "commute",
  "return",
  "school",
  "other",
]);

const validModes = new Set([
  "walk",
  "bus",
  "subway",
  "taxi",
  "drt",
  "other",
]);

const validSentiments = new Set([
  "satisfied",
  "dissatisfied",
]);

export async function createJournal(
  _previousState: JournalActionState,
  formData: FormData,
): Promise<JournalActionState> {
  const parsed =
    parseJournalInput(formData);

  if (!parsed.success) {
    return parsed.state;
  }

  const user = await requireUser();
  const supabase = await createClient();
  const input = parsed.input;

  const endedAt = new Date();

  const startedAt = new Date(
    endedAt.getTime() -
      input.durationMinutes *
        60 *
        1000,
  );

  const {
    data: journal,
    error: journalError,
  } = await supabase
    .from("trip_journals")
    .insert({
      user_id: user.id,
      category: input.category,
      started_at:
        startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      origin_label:
        input.originLabel,
      destination_label:
        input.destinationLabel,
      total_minutes:
        input.durationMinutes,
      route_provider: "kakao",
      route_payload:
        input.routePayload,
    })
    .select("id")
    .single();

  if (journalError || !journal) {
    return errorState(
      `교통일지를 저장하지 못했습니다: ${
        journalError?.message ??
        "저장 결과 없음"
      }`,
    );
  }

  const segmentRows =
    input.segments.map((segment) => ({
      journal_id: journal.id,
      segment_order:
        segment.segmentOrder,
      mode: segment.mode,
      route_number:
        segment.routeNumber || null,
      duration_minutes:
        segment.durationMinutes,
      origin_label:
        segment.originLabel,
      destination_label:
        segment.destinationLabel,
      sentiment:
        segment.sentiment,
      reason_codes:
        segment.reasonCodes,
      memo:
        segment.memo || null,
    }));

  const { error: segmentError } =
    await supabase
      .from("trip_segments")
      .insert(segmentRows);

  if (segmentError) {
    await supabase
      .from("trip_journals")
      .delete()
      .eq("id", journal.id)
      .eq("user_id", user.id);

    return errorState(
      `이동 구간을 저장하지 못했습니다: ${segmentError.message}`,
    );
  }

  revalidatePath("/journal");

  return successState(
    `${segmentRows.length}개 이동 구간의 교통일지가 저장되었습니다.`,
  );
}

export async function updateJournal(
  _previousState: JournalActionState,
  formData: FormData,
): Promise<JournalActionState> {
  const journalId =
    formData
      .get("journalId")
      ?.toString();

  if (!journalId) {
    return errorState(
      "수정할 교통일지 정보가 없습니다.",
    );
  }

  const parsed =
    parseLegacyEditInput(formData);

  if (!parsed.success) {
    return parsed.state;
  }

  const user = await requireUser();
  const supabase = await createClient();
  const input = parsed.input;

  const { data: journal } =
    await supabase
      .from("trip_journals")
      .select("id, ended_at")
      .eq("id", journalId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (!journal) {
    return errorState(
      "수정할 수 없는 교통일지입니다.",
    );
  }

  const endedAt = journal.ended_at
    ? new Date(journal.ended_at)
    : new Date();

  const startedAt = new Date(
    endedAt.getTime() -
      input.durationMinutes *
        60 *
        1000,
  );

  const { error: journalError } =
    await supabase
      .from("trip_journals")
      .update({
        category: input.category,
        started_at:
          startedAt.toISOString(),
        origin_label:
          input.originLabel,
        destination_label:
          input.destinationLabel,
        total_minutes:
          input.durationMinutes,
      })
      .eq("id", journalId)
      .eq("user_id", user.id);

  if (journalError) {
    return errorState(
      "교통일지를 수정하지 못했습니다.",
    );
  }

  const { error: segmentError } =
    await supabase
      .from("trip_segments")
      .update({
        mode: input.mode,
        route_number:
          input.routeNumber || null,
        duration_minutes:
          input.durationMinutes,
        origin_label:
          input.originLabel,
        destination_label:
          input.destinationLabel,
        sentiment:
          input.sentiment,
        reason_codes:
          input.reasonCodes,
        memo: input.memo || null,
      })
      .eq("journal_id", journalId)
      .eq("segment_order", 1);

  if (segmentError) {
    return errorState(
      "이동 구간을 수정하지 못했습니다.",
    );
  }

  revalidatePath("/journal");

  return successState(
    "교통일지가 수정되었습니다.",
  );
}

export async function deleteJournal(
  formData: FormData,
) {
  const journalId =
    formData
      .get("journalId")
      ?.toString();

  if (!journalId) {
    return;
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("trip_journals")
    .delete()
    .eq("id", journalId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(
      "교통일지를 삭제하지 못했습니다.",
    );
  }

  revalidatePath("/journal");
}

function parseJournalInput(
  formData: FormData,
):
  | {
      success: true;
      input: JournalInput;
    }
  | {
      success: false;
      state: JournalActionState;
    } {
  const category =
    formData
      .get("category")
      ?.toString() ?? "";

  const originLabel =
    formData
      .get("originLabel")
      ?.toString()
      .trim() ?? "";

  const destinationLabel =
    formData
      .get("destinationLabel")
      ?.toString()
      .trim() ?? "";

  const durationMinutes = Number(
    formData
      .get("durationMinutes")
      ?.toString(),
  );

  if (!validCategories.has(category)) {
    return {
      success: false,
      state: errorState(
        "이동 유형을 선택해 주세요.",
      ),
    };
  }

  if (
    !originLabel ||
    !destinationLabel
  ) {
    return {
      success: false,
      state: errorState(
        "출발지와 도착지를 선택해 주세요.",
      ),
    };
  }

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 1440
  ) {
    return {
      success: false,
      state: errorState(
        "총 이동 시간이 올바르지 않습니다.",
      ),
    };
  }

  const routePayload =
    parseJson(
      formData
        .get("routePayload")
        ?.toString(),
    );

  const rawSegments =
    parseJson(
      formData
        .get("segmentsJson")
        ?.toString(),
    );

  if (!Array.isArray(rawSegments)) {
    return {
      success: false,
      state: errorState(
        "선택한 경로의 이동 구간 정보가 없습니다.",
      ),
    };
  }

  const segments: SegmentInput[] = [];

  for (
    let index = 0;
    index < rawSegments.length;
    index += 1
  ) {
    const parsed =
      parseSegment(
        rawSegments[index],
        index,
      );

    if (!parsed.success) {
      return parsed;
    }

    segments.push(parsed.segment);
  }

  if (segments.length === 0) {
    return {
      success: false,
      state: errorState(
        "저장할 이동 구간이 없습니다.",
      ),
    };
  }

  return {
    success: true,
    input: {
      category:
        category as JournalInput["category"],
      originLabel,
      destinationLabel,
      durationMinutes,
      routePayload,
      segments,
    },
  };
}

function parseSegment(
  value: unknown,
  index: number,
):
  | {
      success: true;
      segment: SegmentInput;
    }
  | {
      success: false;
      state: JournalActionState;
    } {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return {
      success: false,
      state: errorState(
        `${index + 1}번째 이동 구간이 올바르지 않습니다.`,
      ),
    };
  }

  const row =
    value as Record<string, unknown>;

  const mode =
    typeof row.mode === "string"
      ? row.mode
      : "";

  const sentiment =
    typeof row.sentiment === "string"
      ? row.sentiment
      : "";

  const durationMinutes = Number(
    row.durationMinutes,
  );

  if (!validModes.has(mode)) {
    return {
      success: false,
      state: errorState(
        `${index + 1}번째 이동 수단이 올바르지 않습니다.`,
      ),
    };
  }

  if (
    !validSentiments.has(sentiment)
  ) {
    return {
      success: false,
      state: errorState(
        `${index + 1}번째 구간의 만족도를 선택해 주세요.`,
      ),
    };
  }

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 0 ||
    durationMinutes > 1440
  ) {
    return {
      success: false,
      state: errorState(
        `${index + 1}번째 구간의 시간이 올바르지 않습니다.`,
      ),
    };
  }

  const reasonCodes =
    Array.isArray(row.reasonCodes)
      ? row.reasonCodes
          .filter(
            (reason): reason is string =>
              typeof reason === "string",
          )
          .map((reason) =>
            reason.slice(0, 50),
          )
          .slice(0, 20)
      : [];

  return {
    success: true,
    segment: {
      segmentOrder: index + 1,
      mode: mode as TravelMode,
      routeNumber:
        typeof row.routeNumber ===
        "string"
          ? row.routeNumber
              .trim()
              .slice(0, 100)
          : "",
      durationMinutes,
      originLabel:
        typeof row.originLabel ===
        "string"
          ? row.originLabel
              .trim()
              .slice(0, 100)
          : "",
      destinationLabel:
        typeof row.destinationLabel ===
        "string"
          ? row.destinationLabel
              .trim()
              .slice(0, 100)
          : "",
      sentiment:
        sentiment as Sentiment,
      reasonCodes,
      memo:
        typeof row.memo === "string"
          ? row.memo
              .trim()
              .slice(0, 500)
          : "",
      guidance:
        typeof row.guidance === "string"
          ? row.guidance
          : "",
      distance:
        typeof row.distance === "number"
          ? row.distance
          : 0,
    },
  };
}

function parseLegacyEditInput(
  formData: FormData,
):
  | {
      success: true;
      input: {
        category: string;
        originLabel: string;
        destinationLabel: string;
        durationMinutes: number;
        mode: string;
        routeNumber: string;
        sentiment: string;
        reasonCodes: string[];
        memo: string;
      };
    }
  | {
      success: false;
      state: JournalActionState;
    } {
  const category =
    formData
      .get("category")
      ?.toString() ?? "";

  const originLabel =
    formData
      .get("originLabel")
      ?.toString()
      .trim() ?? "";

  const destinationLabel =
    formData
      .get("destinationLabel")
      ?.toString()
      .trim() ?? "";

  const durationMinutes = Number(
    formData
      .get("durationMinutes")
      ?.toString(),
  );

  const mode =
    formData
      .get("mode")
      ?.toString() ?? "";

  const routeNumber =
    formData
      .get("routeNumber")
      ?.toString()
      .trim() ?? "";

  const sentiment =
    formData
      .get("sentiment")
      ?.toString() ?? "";

  const reasonCodes = formData
    .getAll("reasonCodes")
    .map((value) => value.toString());

  const memo =
    formData
      .get("memo")
      ?.toString()
      .trim() ?? "";

  if (
    !validCategories.has(category) ||
    !originLabel ||
    !destinationLabel ||
    !validModes.has(mode) ||
    !validSentiments.has(sentiment) ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1
  ) {
    return {
      success: false,
      state: errorState(
        "수정할 교통일지 정보를 확인해 주세요.",
      ),
    };
  }

  return {
    success: true,
    input: {
      category,
      originLabel,
      destinationLabel,
      durationMinutes,
      mode,
      routeNumber,
      sentiment,
      reasonCodes,
      memo,
    },
  };
}

function parseJson(
  value: string | undefined,
): unknown {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function successState(
  message: string,
): JournalActionState {
  return {
    status: "success",
    message,
  };
}

function errorState(
  message: string,
): JournalActionState {
  return {
    status: "error",
    message,
  };
}
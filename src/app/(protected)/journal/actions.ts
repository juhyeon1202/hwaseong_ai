"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type JournalActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

type JournalInput = {
  category: string;
  originLabel: string;
  destinationLabel: string;
  mode: string;
  routeNumber: string;
  durationMinutes: number;
  sentiment: string;
  reasonCodes: string[];
  memo: string;
};

const validCategories = [
  "commute",
  "return",
  "school",
  "other",
];

const validModes = [
  "walk",
  "bus",
  "subway",
  "taxi",
  "drt",
  "other",
];

const validSentiments = [
  "satisfied",
  "dissatisfied",
];

export async function createJournal(
  _previousState: JournalActionState,
  formData: FormData,
): Promise<JournalActionState> {
  const parsed = parseJournalInput(formData);

  if (!parsed.success) {
    return parsed.state;
  }

  const user = await requireUser();
  const supabase = await createClient();
  const input = parsed.input;

  const endedAt = new Date();
  const startedAt = new Date(
    endedAt.getTime() -
      input.durationMinutes * 60 * 1000,
  );

  const {
    data: journal,
    error: journalError,
  } = await supabase
    .from("trip_journals")
    .insert({
      user_id: user.id,
      category: input.category,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      origin_label: input.originLabel,
      destination_label:
        input.destinationLabel,
      total_minutes:
        input.durationMinutes,
      route_provider: "manual",
    })
    .select("id")
    .single();

  if (journalError || !journal) {
    return errorState(
      "교통일지를 저장하지 못했습니다.",
    );
  }

  const { error: segmentError } =
    await supabase
      .from("trip_segments")
      .insert({
        journal_id: journal.id,
        segment_order: 1,
        mode: input.mode,
        route_number:
          input.routeNumber || null,
        duration_minutes:
          input.durationMinutes,
        origin_label:
          input.originLabel,
        destination_label:
          input.destinationLabel,
        sentiment: input.sentiment,
        reason_codes:
          input.reasonCodes,
        memo: input.memo || null,
      });

  if (segmentError) {
    await supabase
      .from("trip_journals")
      .delete()
      .eq("id", journal.id)
      .eq("user_id", user.id);

    return errorState(
      "이동 세부 정보를 저장하지 못했습니다.",
    );
  }

  revalidatePath("/journal");

  return successState(
    "교통일지가 저장되었습니다.",
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

  const parsed = parseJournalInput(formData);

  if (!parsed.success) {
    return parsed.state;
  }

  const user = await requireUser();
  const supabase = await createClient();
  const input = parsed.input;

  const { data: ownedJournal } =
    await supabase
      .from("trip_journals")
      .select("id, ended_at")
      .eq("id", journalId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (!ownedJournal) {
    return errorState(
      "수정할 수 없는 교통일지입니다.",
    );
  }

  const endedAt = ownedJournal.ended_at
    ? new Date(ownedJournal.ended_at)
    : new Date();

  const startedAt = new Date(
    endedAt.getTime() -
      input.durationMinutes * 60 * 1000,
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
        sentiment: input.sentiment,
        reason_codes:
          input.reasonCodes,
        memo: input.memo || null,
      })
      .eq("journal_id", journalId)
      .eq("segment_order", 1);

  if (segmentError) {
    return errorState(
      "이동 세부 정보를 수정하지 못했습니다.",
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
    formData.get("category")?.toString() ??
    "";

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

  const mode =
    formData.get("mode")?.toString() ??
    "";

  const routeNumber =
    formData
      .get("routeNumber")
      ?.toString()
      .trim() ?? "";

  const durationMinutes = Number(
    formData
      .get("durationMinutes")
      ?.toString(),
  );

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
    !validCategories.includes(category)
  ) {
    return {
      success: false,
      state: errorState(
        "이동 목적을 선택해 주세요.",
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
        "출발지와 도착지를 입력해 주세요.",
      ),
    };
  }

  if (!validModes.includes(mode)) {
    return {
      success: false,
      state: errorState(
        "이동 수단을 선택해 주세요.",
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
        "이동 시간을 올바르게 입력해 주세요.",
      ),
    };
  }

  if (
    !validSentiments.includes(
      sentiment,
    )
  ) {
    return {
      success: false,
      state: errorState(
        "이동 만족도를 선택해 주세요.",
      ),
    };
  }

  return {
    success: true,
    input: {
      category,
      originLabel,
      destinationLabel,
      mode,
      routeNumber,
      durationMinutes,
      sentiment,
      reasonCodes,
      memo,
    },
  };
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
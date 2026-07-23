"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireUser,
} from "@/lib/auth";
import {
  createClient,
} from "@/lib/supabase/server";

export type FavoriteActionState = {
  status:
    | "idle"
    | "success"
    | "error";
  message: string;
};

type PlacePayload = {
  type: "place";
  kakaoPlaceId: string;
  placeName: string;
  address: string;
  latitude: number;
  longitude: number;
};

type RouteStepPayload = {
  type:
    | "BUS"
    | "SUBWAY"
    | "WALKING";
  guidance: string;
  distance: number;
  time: number;
  vehicles: string[];
};

type RoutePayload = {
  type: "route";
  startPlace: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  endPlace: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  route: {
    type: string;
    totalDistance: number;
    totalTime: number;
    transfers: number;
    fare: number | null;
    steps: RouteStepPayload[];
  };
};

const initialState: FavoriteActionState = {
  status: "idle",
  message: "",
};

export const favoriteInitialState =
  initialState;

export async function createFavorite(
  _previousState: FavoriteActionState,
  formData: FormData,
): Promise<FavoriteActionState> {
  const user = await requireUser();
  const supabase =
    await createClient();

  const favoriteType =
    formData
      .get("favoriteType")
      ?.toString();

  const label =
    formData
      .get("label")
      ?.toString()
      .trim() ?? "";

  const payloadText =
    formData
      .get("payload")
      ?.toString() ?? "";

  if (
    favoriteType !== "place" &&
    favoriteType !== "route"
  ) {
    return errorState(
      "즐겨찾기 유형을 선택해 주세요.",
    );
  }

  if (
    label.length < 1 ||
    label.length > 100
  ) {
    return errorState(
      "즐겨찾기 이름은 1자 이상 100자 이하로 입력해 주세요.",
    );
  }

  let payload: unknown;

  try {
    payload =
      JSON.parse(payloadText);
  } catch {
    return errorState(
      "선택한 즐겨찾기 정보가 올바르지 않습니다.",
    );
  }

  if (
    favoriteType === "place"
  ) {
    if (!isValidPlacePayload(payload)) {
      return errorState(
        "카카오맵 검색 결과에서 장소를 선택해 주세요.",
      );
    }
  }

  if (
    favoriteType === "route"
  ) {
    if (!isValidRoutePayload(payload)) {
      return errorState(
        "추천 경로 중 저장할 노선을 선택해 주세요.",
      );
    }
  }

  const { error } =
    await supabase
      .from("favorites")
      .insert({
        user_id: user.id,
        favorite_type:
          favoriteType,
        label,
        stop_id: null,
        route_id: null,
        place_payload:
          payload,
      });

  if (error) {
    console.error(
      "[Create favorite error]",
      error,
    );

    return errorState(
      "즐겨찾기를 저장하지 못했습니다.",
    );
  }

  revalidatePath("/favorites");
  revalidatePath("/mypage");

  return successState(
    "즐겨찾기에 추가되었습니다.",
  );
}

export async function deleteFavorite(
  formData: FormData,
) {
  const user = await requireUser();

  const favoriteId =
    formData
      .get("favoriteId")
      ?.toString();

  if (!favoriteId) {
    throw new Error(
      "삭제할 즐겨찾기 정보가 없습니다.",
    );
  }

  const supabase =
    await createClient();

  const { error } =
    await supabase
      .from("favorites")
      .delete()
      .eq("id", favoriteId)
      .eq("user_id", user.id);

  if (error) {
    throw new Error(
      "즐겨찾기를 삭제하지 못했습니다.",
    );
  }

  revalidatePath("/favorites");
  revalidatePath("/mypage");
}

function isValidPlacePayload(
  value: unknown,
): value is PlacePayload {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const payload =
    value as Partial<PlacePayload>;

  return (
    payload.type === "place" &&
    typeof payload.kakaoPlaceId ===
      "string" &&
    typeof payload.placeName ===
      "string" &&
    typeof payload.address ===
      "string" &&
    isValidLatitude(
      payload.latitude,
    ) &&
    isValidLongitude(
      payload.longitude,
    )
  );
}

function isValidRoutePayload(
  value: unknown,
): value is RoutePayload {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const payload =
    value as Partial<RoutePayload>;

  if (
    payload.type !== "route" ||
    !payload.startPlace ||
    !payload.endPlace ||
    !payload.route
  ) {
    return false;
  }

  return (
    typeof payload.startPlace
      .name === "string" &&
    isValidLatitude(
      payload.startPlace.latitude,
    ) &&
    isValidLongitude(
      payload.startPlace.longitude,
    ) &&
    typeof payload.endPlace
      .name === "string" &&
    isValidLatitude(
      payload.endPlace.latitude,
    ) &&
    isValidLongitude(
      payload.endPlace.longitude,
    ) &&
    Number.isFinite(
      payload.route.totalTime,
    ) &&
    Number.isFinite(
      payload.route.totalDistance,
    ) &&
    Array.isArray(
      payload.route.steps,
    )
  );
}

function isValidLatitude(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= -90 &&
    value <= 90
  );
}

function isValidLongitude(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= -180 &&
    value <= 180
  );
}

function successState(
  message: string,
): FavoriteActionState {
  return {
    status: "success",
    message,
  };
}

function errorState(
  message: string,
): FavoriteActionState {
  return {
    status: "error",
    message,
  };
}
"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Badge, Button, Card, EmptyState, SectionHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type FavoriteType = "place" | "route";

type Place = {
  id: string;
  name: string;
  address: string;
  longitude: number;
  latitude: number;
};

type RouteStep = {
  type: "BUS" | "SUBWAY" | "WALKING";
  guidance: string;
  distance: number;
  time: number;
  vehicles: string[];
};

type RouteOption = {
  id: number;
  type: string;
  totalDistance: number;
  totalTime: number;
  transfers: number;
  fare: number | null;
  steps: RouteStep[];
};

type FavoritePayload =
  | {
      type: "place";
      kakaoPlaceId: string;
      placeName: string;
      address: string;
      latitude: number;
      longitude: number;
    }
  | {
      type: "route";
      startPlace: Place;
      endPlace: Place;
      route: RouteOption;
    };

type Favorite = {
  id: string;
  favorite_type: FavoriteType;
  label: string;
  place_payload: FavoritePayload | null;
  created_at: string;
};

type PlaceResponse = { places?: Place[]; message?: string };
type RouteResponse = { routes?: RouteOption[]; message?: string };

export default function FavoritesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    const { data: userResult, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userResult.user) {
      setLoadError("로그인이 필요합니다.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("id, favorite_type, label, place_payload, created_at")
      .eq("user_id", userResult.user.id)
      .in("favorite_type", ["place", "route"])
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError("즐겨찾기를 불러오지 못했습니다.");
    } else {
      setFavorites((data ?? []) as Favorite[]);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  async function deleteFavorite(id: string) {
    if (!window.confirm("즐겨찾기에서 삭제할까요?")) return;

    const { error } = await supabase.from("favorites").delete().eq("id", id);
    if (error) {
      window.alert("즐겨찾기를 삭제하지 못했습니다.");
      return;
    }
    setFavorites((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeader
          title="즐겨찾기"
          description="자주 방문하는 장소와 이용할 대중교통 노선을 확인하세요."
        />

        {isLoading ? (
          <Card><p className="text-sm text-muted">즐겨찾기를 불러오는 중입니다.</p></Card>
        ) : loadError ? (
          <Card><p className="text-sm text-danger">{loadError}</p></Card>
        ) : favorites.length === 0 ? (
          <EmptyState
            title="저장한 즐겨찾기가 없습니다"
            description="장소 또는 대중교통 노선을 추가해 보세요."
          />
        ) : (
          <div
            className="favorite-list-scroll"
            style={{
              height: "350px",
              maxHeight: "350px",
              overflowX: "hidden",
              overflowY: "scroll",
            }}
          >
            <ul className="space-y-3 pr-3">
              {favorites.map((favorite) => (
                <FavoriteCard
                  key={favorite.id}
                  favorite={favorite}
                  onDelete={deleteFavorite}
                />
              ))}
            </ul>
          </div>
        )}

        <style jsx global>{`
          .favorite-list-scroll {
            scrollbar-gutter: stable;
            scrollbar-width: auto;
            scrollbar-color: #9ca3af #e5e7eb;
            overscroll-behavior: contain;
          }

          .favorite-list-scroll::-webkit-scrollbar {
            width: 10px;
          }

          .favorite-list-scroll::-webkit-scrollbar-track {
            border-radius: 999px;
            background: #e5e7eb;
          }

          .favorite-list-scroll::-webkit-scrollbar-thumb {
            border: 2px solid #e5e7eb;
            border-radius: 999px;
            background: #9ca3af;
          }
        `}</style>
      </section>

      <FavoriteForm supabase={supabase} onSaved={loadFavorites} />
    </div>
  );
}

function FavoriteForm({
  supabase,
  onSaved,
}: {
  supabase: ReturnType<typeof createClient>;
  onSaved: () => Promise<void>;
}) {
  const [favoriteType, setFavoriteType] = useState<FavoriteType>("place");
  const [label, setLabel] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [startPlace, setStartPlace] = useState<Place | null>(null);
  const [endPlace, setEndPlace] = useState<Place | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [isSearchingRoutes, setIsSearchingRoutes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function changeType(type: FavoriteType) {
    setFavoriteType(type);
    setLabel("");
    setPlace(null);
    setStartPlace(null);
    setEndPlace(null);
    setRoutes([]);
    setSelectedRoute(null);
    setMessage("");
  }

  async function findRoutes() {
    if (!startPlace || !endPlace) {
      setIsError(true);
      setMessage("출발지와 도착지를 모두 선택해 주세요.");
      return;
    }

    setIsSearchingRoutes(true);
    setMessage("");
    setRoutes([]);
    setSelectedRoute(null);

    try {
      const params = new URLSearchParams({
        mode: "routes",
        startX: String(startPlace.longitude),
        startY: String(startPlace.latitude),
        endX: String(endPlace.longitude),
        endY: String(endPlace.latitude),
        startName: startPlace.name,
        endName: endPlace.name,
      });
      const response = await fetch(`/api/kakao?${params.toString()}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as RouteResponse;
      if (!response.ok) {
        throw new Error(result.message || "추천 경로를 찾지 못했습니다.");
      }

      const nextRoutes = result.routes ?? [];
      setRoutes(nextRoutes);
      if (nextRoutes.length === 0) {
        setIsError(true);
        setMessage("이동 가능한 대중교통 경로가 없습니다.");
      }
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "추천 경로를 찾지 못했습니다.");
    } finally {
      setIsSearchingRoutes(false);
    }
  }

  async function saveFavorite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setIsError(true);
      setMessage("즐겨찾기 이름을 입력해 주세요.");
      return;
    }

    let payload: FavoritePayload;
    if (favoriteType === "place") {
      if (!place) {
        setIsError(true);
        setMessage("검색 결과에서 장소를 선택해 주세요.");
        return;
      }
      payload = {
        type: "place",
        kakaoPlaceId: place.id,
        placeName: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
      };
    } else {
      if (!startPlace || !endPlace || !selectedRoute) {
        setIsError(true);
        setMessage("추천 경로 중 저장할 노선을 선택해 주세요.");
        return;
      }
      payload = { type: "route", startPlace, endPlace, route: selectedRoute };
    }

    setIsSaving(true);
    setMessage("");
    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult.user) {
      setIsSaving(false);
      setIsError(true);
      setMessage("로그인이 필요합니다.");
      return;
    }

    const { error } = await supabase.from("favorites").insert({
      user_id: userResult.user.id,
      favorite_type: favoriteType,
      label: trimmedLabel,
      stop_id: null,
      route_id: null,
      place_payload: payload,
    });

    setIsSaving(false);
    if (error) {
      setIsError(true);
      setMessage("즐겨찾기를 저장하지 못했습니다.");
      return;
    }

    setIsError(false);
    setMessage("즐겨찾기에 추가되었습니다.");
    setLabel("");
    setPlace(null);
    setStartPlace(null);
    setEndPlace(null);
    setRoutes([]);
    setSelectedRoute(null);
    await onSaved();
  }

  return (
    <section>
      <Card>
        <SectionHeader
          title="즐겨찾기 추가"
          description="장소 또는 마음에 드는 추천 노선을 저장하세요."
        />

        <form onSubmit={saveFavorite} className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {(["place", "route"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => changeType(type)}
                className={[
                  "min-h-11 rounded-control border text-sm font-bold",
                  favoriteType === type
                    ? "border-[#5470e8] bg-[#5470e8] text-white"
                    : "border-line bg-white text-secondary",
                ].join(" ")}
              >
                {type === "place" ? "장소" : "노선"}
              </button>
            ))}
          </div>

          {favoriteType === "place" ? (
            <div className="w-full space-y-4 rounded-control border border-line bg-white p-5 lg:p-6">
              <h3 className="text-lg font-bold text-main">장소 검색 및 추가</h3>
              <FavoriteNameField value={label} onChange={setLabel} placeholder="예: 학교" />
              <PlaceSearch label="장소 검색" selected={place} onSelect={setPlace} />
              <FormMessage message={message} isError={isError} />
              <Button type="submit" fullWidth disabled={isSaving}>
                {isSaving ? "저장 중..." : "즐겨찾기 추가"}
              </Button>
            </div>
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
              <div className="space-y-4 rounded-control border border-line bg-white p-5">
                <div>
                  <h3 className="text-lg font-bold text-main">출발지와 도착지</h3>
                  <p className="mt-1 text-sm text-muted">장소를 선택한 뒤 추천 경로를 찾아보세요.</p>
                </div>
                <FavoriteNameField value={label} onChange={setLabel} placeholder="예: 등교 노선" />
                <PlaceSearch
                  label="출발지"
                  selected={startPlace}
                  onSelect={(value) => {
                    setStartPlace(value);
                    setRoutes([]);
                    setSelectedRoute(null);
                  }}
                />
                <PlaceSearch
                  label="도착지"
                  selected={endPlace}
                  onSelect={(value) => {
                    setEndPlace(value);
                    setRoutes([]);
                    setSelectedRoute(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => void findRoutes()}
                  disabled={isSearchingRoutes || !startPlace || !endPlace}
                  className="min-h-12 w-full rounded-control bg-[#5470e8] text-sm font-bold text-white disabled:opacity-50"
                >
                  {isSearchingRoutes ? "경로 검색 중..." : "추천 경로 찾기"}
                </button>
                <FormMessage message={message} isError={isError} />
              </div>

              <div className="rounded-control border border-line bg-white p-5">
                <div>
                  <h3 className="text-lg font-bold text-main">추천 경로</h3>
                  <p className="mt-1 text-sm text-muted">마음에 드는 경로를 선택해 즐겨찾기에 추가하세요.</p>
                </div>

                {routes.length === 0 ? (
                  <div className="mt-4 flex min-h-64 items-center justify-center rounded-control border border-dashed border-line bg-surface-muted px-5 text-center text-sm text-muted">
                    {isSearchingRoutes
                      ? "추천 경로를 찾고 있습니다."
                      : "출발지와 도착지를 선택하고 추천 경로 찾기를 눌러 주세요."}
                  </div>
                ) : (
                  <ul className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-2">
                    {routes.map((route) => (
                      <li key={route.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedRoute(route)}
                          className={[
                            "w-full rounded-control border p-4 text-left",
                            selectedRoute?.id === route.id
                              ? "border-[#d87525] bg-[#fff8f2]"
                              : "border-line bg-white",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <strong className="text-xl text-main">{formatMinutes(route.totalTime)}</strong>
                            <span className="text-xs text-muted">환승 {route.transfers}회</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-secondary">{formatRouteVehicles(route)}</p>
                          <p className="mt-1 text-xs text-muted">
                            총 거리 {formatDistance(route.totalDistance)}
                            {route.fare != null ? ` · ${route.fare.toLocaleString()}원` : ""}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4">
                  <Button type="submit" fullWidth disabled={isSaving || !selectedRoute}>
                    {isSaving ? "저장 중..." : "선택한 노선 즐겨찾기 추가"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      </Card>
    </section>
  );
}

function FavoriteNameField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-main">즐겨찾기 이름</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={100}
        placeholder={placeholder}
        className={inputClassName}
      />
    </label>
  );
}

function FormMessage({ message, isError }: { message: string; isError: boolean }) {
  if (!message) return null;
  return (
    <p className={[
      "rounded-control p-3 text-sm",
      isError ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
    ].join(" ")}>
      {message}
    </p>
  );
}

function PlaceSearch({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: Place | null;
  onSelect: (place: Place) => void;
}) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    if (query.trim().length < 2) {
      setError("검색어를 2자 이상 입력해 주세요.");
      return;
    }
    setIsSearching(true);
    setError("");
    setPlaces([]);

    try {
      const params = new URLSearchParams({ mode: "places", query: query.trim() });
      const response = await fetch(`/api/kakao?${params.toString()}`, { cache: "no-store" });
      const result = (await response.json()) as PlaceResponse;
      if (!response.ok) throw new Error(result.message || "장소 검색에 실패했습니다.");
      setPlaces(result.places ?? []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "장소 검색에 실패했습니다.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div>
      <span className="mb-2 block text-sm font-bold text-main">{label}</span>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPlaces([]);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
          placeholder="예: 한신대학교"
          className={inputClassName}
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={isSearching}
          className="shrink-0 rounded-control border border-[#5470e8] px-4 text-sm font-bold text-[#5470e8] disabled:opacity-50"
        >
          {isSearching ? "검색 중" : "검색"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {places.length > 0 && (
        <ul className="mt-2 max-h-52 overflow-y-auto rounded-control border border-line bg-white">
          {places.map((item) => (
            <li key={item.id} className="border-b border-line-light last:border-0">
              <button
                type="button"
                onClick={() => {
                  onSelect(item);
                  setQuery(item.name);
                  setPlaces([]);
                }}
                className="w-full px-3 py-3 text-left hover:bg-surface-muted"
              >
                <strong className="block text-sm text-main">{item.name}</strong>
                <span className="mt-1 block text-xs text-muted">{item.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="mt-2 rounded-control border border-[#aebcf7] bg-[#edf2ff] p-3">
          <strong className="block text-sm text-main">{selected.name}</strong>
          <span className="mt-1 block text-xs text-muted">{selected.address}</span>
        </div>
      )}
    </div>
  );
}

function FavoriteCard({
  favorite,
  onDelete,
}: {
  favorite: Favorite;
  onDelete: (id: string) => Promise<void>;
}) {
  const payload = favorite.place_payload;
  return (
    <li>
      <Card>
        <div className="flex items-start gap-3">
          <Badge variant="brand">{favorite.favorite_type === "place" ? "장소" : "노선"}</Badge>
          <div className="min-w-0 flex-1">
            <strong className="block text-main">{favorite.label}</strong>
            {payload?.type === "place" && (
              <>
                <p className="mt-2 text-sm text-secondary">{payload.placeName}</p>
                <p className="mt-1 text-xs text-muted">{payload.address}</p>
              </>
            )}
            {payload?.type === "route" && (
              <>
                <p className="mt-2 text-sm text-secondary">
                  {payload.startPlace.name} → {payload.endPlace.name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatMinutes(payload.route.totalTime)} · 환승 {payload.route.transfers}회 · {formatRouteVehicles(payload.route)}
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => void onDelete(favorite.id)}
            className="text-xs font-bold text-danger"
          >
            삭제
          </button>
        </div>
      </Card>
    </li>
  );
}

function formatRouteVehicles(route: RouteOption) {
  const names = route.steps
    .filter((step) => step.type !== "WALKING")
    .flatMap((step) => step.vehicles)
    .filter(Boolean);
  return names.length > 0 ? names.join(" → ") : "대중교통 경로";
}

function formatMinutes(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))}분`;
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`;
}

const inputClassName = [
  "min-h-11 w-full rounded-control",
  "border border-line bg-white px-3",
  "text-sm text-main outline-none",
  "placeholder:text-muted focus:border-[#5470e8]",
].join(" ");

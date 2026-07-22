import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import {
  DeleteFavoriteButton,
  FavoriteForm,
  type FavoriteRouteOption,
  type FavoriteStopOption,
} from "@/components/account-tools";
import {
  Badge,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "즐겨찾기",
};

type Favorite = {
  id: string;
  favorite_type:
    | "place"
    | "stop"
    | "route";
  label: string;
  place_payload:
    | {
        address?: string;
      }
    | null;
  created_at: string;
};

const favoriteTypeLabels = {
  place: "장소",
  stop: "정류장",
  route: "노선",
} as const;

export default async function FavoritesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    favoriteResult,
    stopResult,
    routeResult,
  ] = await Promise.all([
    supabase
      .from("favorites")
      .select(
        `
          id,
          favorite_type,
          label,
          place_payload,
          created_at
        `,
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("transit_stops")
      .select(
        `
          id,
          name,
          stop_number
        `,
      )
      .order("name")
      .limit(500),

    supabase
      .from("bus_routes")
      .select(
        `
          id,
          route_number,
          start_stop_name,
          end_stop_name
        `,
      )
      .order("route_number")
      .limit(500),
  ]);

  const favorites =
    (favoriteResult.data as
      | Favorite[]
      | null) ?? [];

  const stops: FavoriteStopOption[] =
    (stopResult.data ?? []).map(
      (stop) => ({
        id: Number(stop.id),
        name: stop.name,
        stopNumber:
          stop.stop_number,
      }),
    );

  const routes: FavoriteRouteOption[] =
    (routeResult.data ?? []).map(
      (route) => ({
        id: Number(route.id),
        routeNumber:
          route.route_number,
        startStopName:
          route.start_stop_name,
        endStopName:
          route.end_stop_name,
      }),
    );

  return (
    <AppShell user={user}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <section className="space-y-4">
          <SectionHeader
            title="즐겨찾기"
            description="자주 이용하는 교통 정보를 확인하세요."
          />

          {favoriteResult.error ? (
            <Card>
              <p className="text-sm text-danger">
                즐겨찾기를 불러오지
                못했습니다.
              </p>
            </Card>
          ) : favorites.length === 0 ? (
            <EmptyState
              title="저장한 즐겨찾기가 없습니다"
              description="자주 이용하는 장소나 정류장을 추가해 보세요."
            />
          ) : (
            <ul className="space-y-3">
              {favorites.map(
                (favorite) => (
                  <li key={favorite.id}>
                    <Card>
                      <div className="flex items-start gap-3">
                        <Badge variant="brand">
                          {
                            favoriteTypeLabels[
                              favorite.favorite_type
                            ]
                          }
                        </Badge>

                        <div className="min-w-0 flex-1">
                          <strong className="block text-main">
                            {favorite.label}
                          </strong>

                          {favorite
                            .favorite_type ===
                            "place" &&
                            favorite
                              .place_payload
                              ?.address && (
                              <p className="mt-1 text-xs text-muted">
                                {
                                  favorite
                                    .place_payload
                                    .address
                                }
                              </p>
                            )}
                        </div>

                        <DeleteFavoriteButton
                          favoriteId={
                            favorite.id
                          }
                        />
                      </div>
                    </Card>
                  </li>
                ),
              )}
            </ul>
          )}
        </section>

        <aside>
          <FavoriteForm
            stops={stops}
            routes={routes}
          />
        </aside>
      </div>
    </AppShell>
  );
}
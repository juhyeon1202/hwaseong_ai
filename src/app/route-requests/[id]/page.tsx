import type { Metadata } from "next";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

type RouteRequestPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: "희망 노선",
};

export default async function RouteRequestPage({
  params,
}: RouteRequestPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("route_requests")
    .select("post_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  if (data.post_id) {
    redirect(
      `/community/${data.post_id}`,
    );
  }

  // 과거에 게시글 연결 없이 생성된 노선 데이터
  redirect("/community");
}
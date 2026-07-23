import {
  AdminDrtReviewPanel,
  type DrtActionData,
} from "@/components/admin-drt-review-panel";
import {
  createClient,
} from "@/lib/supabase/server";

type AdminDrtReviewLoaderProps = {
  incidentId: number;
};

export async function AdminDrtReviewLoader({
  incidentId,
}: AdminDrtReviewLoaderProps) {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("ai_actions")
    .select(
      `
        id,
        status,
        title,
        content,
        payload,
        created_at
      `,
    )
    .eq(
      "incident_id",
      incidentId,
    )
    .eq(
      "action_type",
      "drt_recommendation",
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[DRT action load error]",
      error,
    );
  }

  return (
    <AdminDrtReviewPanel
      incidentId={
        incidentId
      }
      initialAction={
        error
          ? null
          : (
              data as
                | DrtActionData
                | null
            )
      }
    />
  );
}
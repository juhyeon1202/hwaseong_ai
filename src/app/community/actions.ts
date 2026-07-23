"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  requireAdmin,
  requireUser,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PostActionState = {
  status:
    | "idle"
    | "success"
    | "error";
  message: string;
};

export type CommentActionState =
  PostActionState;

export type ReportActionState =
  PostActionState;

export type RouteSuggestionActionState =
  PostActionState;

/*
 * route_suggestion은 정류장 선택(post_route_stops)이 반드시 필요해
 * createPost/updatePost가 아니라 전용 액션(create/updateRouteSuggestionPost)
 * 으로만 만들 수 있도록 일반 글쓰기 카테고리 목록에서 제외합니다.
 */
const validCategories = [
  "route_request",
  "information",
  "question",
];

// route_requests(희망 노선)와 동일하게 최소 5개, 상한 없음
const minRouteSuggestionStops = 5;

const validBusTypes = [
  "city",
  "village",
  "other",
];

const validReportReasons = [
  "spam",
  "abuse",
  "false_info",
  "other",
];

export async function createPost(
  _previousState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const user = await requireUser();

  const parsed =
    parsePostForm(formData);

  if (!parsed.success) {
    return parsed.state;
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      category: parsed.category,
      bus_type:
        parsed.busType || null,
      title: parsed.title,
      content: parsed.content,
    });

  if (error) {
    return errorState(
      "게시글을 등록하지 못했습니다.",
    );
  }

  revalidatePath("/community");

  return successState(
    "게시글이 등록되었습니다.",
  );
}

export async function updatePost(
  _previousState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const user = await requireUser();

  const postId =
    formData.get("postId")?.toString();

  if (!postId) {
    return errorState(
      "수정할 게시글 정보가 없습니다.",
    );
  }

  const parsed =
    parsePostForm(formData);

  if (!parsed.success) {
    return parsed.state;
  }

  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .update({
      category: parsed.category,
      bus_type:
        parsed.busType || null,
      title: parsed.title,
      content: parsed.content,
    })
    .eq("id", postId);

  if (user.role !== "admin") {
    query = query.eq(
      "author_id",
      user.id,
    );
  }

  const { error } = await query;

  if (error) {
    return errorState(
      "게시글을 수정하지 못했습니다.",
    );
  }

  revalidatePath("/community");
  revalidatePath(
    `/community/${postId}`,
  );

  return successState(
    "게시글이 수정되었습니다.",
  );
}

export async function deletePost(
  formData: FormData,
) {
  const user = await requireUser();

  const postId =
    formData.get("postId")?.toString();

  if (!postId) {
    throw new Error(
      "삭제할 게시글 정보가 없습니다.",
    );
  }

  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .delete()
    .eq("id", postId);

  if (user.role !== "admin") {
    query = query.eq(
      "author_id",
      user.id,
    );
  }

  const { error } = await query;

  if (error) {
    throw new Error(
      "게시글을 삭제하지 못했습니다.",
    );
  }

  revalidatePath("/community");
  // route_suggestion 게시글이면 연결된 route_requests가
  // on delete cascade로 함께 삭제되므로 같이 재검증합니다.
  revalidatePath("/route-requests");
  revalidatePath(
    "/admin/route-requests",
  );
  redirect("/community");
}

export async function createComment(
  _previousState: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const user = await requireUser();

  const postId =
    formData.get("postId")?.toString();

  const content =
    formData
      .get("content")
      ?.toString()
      .trim() ?? "";

  const isSecret =
    formData.get("isSecret") === "on";

  if (!postId) {
    return errorState(
      "댓글을 작성할 게시글 정보가 없습니다.",
    );
  }

  if (
    content.length < 1 ||
    content.length > 1000
  ) {
    return errorState(
      "댓글은 1자 이상 1000자 이하로 작성해 주세요.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      content,
      is_secret: isSecret,
    });

  if (error) {
    return errorState(
      "댓글을 등록하지 못했습니다.",
    );
  }

  revalidatePath(
    `/community/${postId}`,
  );

  return successState(
    "댓글이 등록되었습니다.",
  );
}

export async function deleteComment(
  formData: FormData,
) {
  const user = await requireUser();

  const commentId =
    formData
      .get("commentId")
      ?.toString();

  const postId =
    formData.get("postId")?.toString();

  if (!commentId || !postId) {
    throw new Error(
      "삭제할 댓글 정보가 없습니다.",
    );
  }

  const supabase = await createClient();

  let query = supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId);

  if (user.role !== "admin") {
    query = query.eq(
      "author_id",
      user.id,
    );
  }

  const { error } = await query;

  if (error) {
    throw new Error(
      "댓글을 삭제하지 못했습니다.",
    );
  }

  revalidatePath(
    `/community/${postId}`,
  );
}

export async function reportPost(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const user = await requireUser();

  const postId =
    formData.get("postId")?.toString();

  const reason =
    formData
      .get("reason")
      ?.toString() ?? "";

  const detail =
    formData
      .get("detail")
      ?.toString()
      .trim() || null;

  if (!postId) {
    return errorState(
      "신고할 게시글 정보가 없습니다.",
    );
  }

  if (
    !validReportReasons.includes(
      reason,
    )
  ) {
    return errorState(
      "신고 사유를 선택해 주세요.",
    );
  }

  if (
    detail &&
    detail.length > 500
  ) {
    return errorState(
      "상세 사유는 500자 이하로 입력해 주세요.",
    );
  }

  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .single();

  if (!post) {
    return errorState(
      "존재하지 않는 게시글입니다.",
    );
  }

  if (post.author_id === user.id) {
    return errorState(
      "본인 게시글은 신고할 수 없습니다.",
    );
  }

  const { error } = await supabase
    .from("post_reports")
    .insert({
      post_id: postId,
      reporter_id: user.id,
      reason,
      detail,
    });

  if (error) {
    if (error.code === "23505") {
      return errorState(
        "이미 신고한 게시글입니다.",
      );
    }

    return errorState(
      "신고를 접수하지 못했습니다.",
    );
  }

  revalidatePath(
    `/community/${postId}`,
  );

  return successState(
    "신고가 접수되었습니다. 검토 후 조치하겠습니다.",
  );
}

export async function setPostVisibility(
  formData: FormData,
) {
  await requireAdmin();

  const postId =
    formData.get("postId")?.toString();

  const hidden =
    formData.get("hidden") === "true";

  if (!postId) {
    throw new Error(
      "처리할 게시글 정보가 없습니다.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("posts")
    .update({ is_hidden: hidden })
    .eq("id", postId);

  if (error) {
    throw new Error(
      "게시글 공개 상태를 변경하지 못했습니다.",
    );
  }

  revalidatePath(
    "/admin/post-reports",
  );
  revalidatePath(
    `/community/${postId}`,
  );
  revalidatePath("/community");
}

export async function createRouteSuggestionPost(
  _previousState: RouteSuggestionActionState,
  formData: FormData,
): Promise<RouteSuggestionActionState> {
  await requireUser();

  const parsed =
    parseRouteSuggestionForm(
      formData,
    );

  if (!parsed.success) {
    return parsed.state;
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "create_route_suggestion_post",
    {
      p_title: parsed.title,
      p_content: parsed.content,
      p_bus_type:
        parsed.busType || null,
      p_stop_ids: parsed.stopIds,
    },
  );

  if (error) {
    return errorState(
      error.message ||
        "노선제안을 등록하지 못했습니다.",
    );
  }

  revalidatePath("/community");
  revalidatePath("/route-requests");
  revalidatePath(
    "/admin/route-requests",
  );

  return successState(
    "노선제안이 등록되었습니다.",
  );
}

export async function updateRouteSuggestionPost(
  _previousState: RouteSuggestionActionState,
  formData: FormData,
): Promise<RouteSuggestionActionState> {
  await requireUser();

  const postId =
    formData.get("postId")?.toString();

  if (!postId) {
    return errorState(
      "수정할 게시글 정보가 없습니다.",
    );
  }

  const parsed =
    parseRouteSuggestionForm(
      formData,
    );

  if (!parsed.success) {
    return parsed.state;
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "update_route_suggestion_post",
    {
      p_post_id: postId,
      p_title: parsed.title,
      p_content: parsed.content,
      p_bus_type:
        parsed.busType || null,
      p_stop_ids: parsed.stopIds,
    },
  );

  if (error) {
    return errorState(
      error.message ||
        "노선제안을 수정하지 못했습니다.",
    );
  }

  revalidatePath("/community");
  revalidatePath(
    `/community/${postId}`,
  );
  revalidatePath("/route-requests");
  revalidatePath(
    "/admin/route-requests",
  );

  return successState(
    "노선제안이 수정되었습니다.",
  );
}

function parseRouteSuggestionForm(
  formData: FormData,
):
  | {
      success: true;
      title: string;
      content: string;
      busType: string;
      stopIds: number[];
    }
  | {
      success: false;
      state: RouteSuggestionActionState;
    } {
  const title =
    formData
      .get("title")
      ?.toString()
      .trim() ?? "";

  const content =
    formData
      .get("content")
      ?.toString()
      .trim() ?? "";

  const busType =
    formData
      .get("busType")
      ?.toString() ?? "";

  const stopIds = formData
    .getAll("stopIds")
    .map((value) =>
      Number(value.toString()),
    )
    .filter((value) =>
      Number.isInteger(value),
    );

  if (
    title.length < 2 ||
    title.length > 100
  ) {
    return {
      success: false,
      state: errorState(
        "노선 이름은 2자 이상 100자 이하로 입력해 주세요.",
      ),
    };
  }

  if (
    content.length < 5 ||
    content.length > 5000
  ) {
    return {
      success: false,
      state: errorState(
        "제안 사유는 5자 이상 5000자 이하로 입력해 주세요.",
      ),
    };
  }

  if (
    busType &&
    !validBusTypes.includes(busType)
  ) {
    return {
      success: false,
      state: errorState(
        "올바른 버스 유형을 선택해 주세요.",
      ),
    };
  }

  if (
    stopIds.length <
    minRouteSuggestionStops
  ) {
    return {
      success: false,
      state: errorState(
        `정류장을 최소 ${minRouteSuggestionStops}개 선택해 주세요.`,
      ),
    };
  }

  return {
    success: true,
    title,
    content,
    busType,
    stopIds,
  };
}

function parsePostForm(
  formData: FormData,
):
  | {
      success: true;
      category: string;
      busType: string;
      title: string;
      content: string;
    }
  | {
      success: false;
      state: PostActionState;
    } {
  const category =
    formData
      .get("category")
      ?.toString() ?? "";

  const busType =
    formData
      .get("busType")
      ?.toString() ?? "";

  const title =
    formData
      .get("title")
      ?.toString()
      .trim() ?? "";

  const content =
    formData
      .get("content")
      ?.toString()
      .trim() ?? "";

  if (
    !validCategories.includes(
      category,
    )
  ) {
    return {
      success: false,
      state: errorState(
        "게시글 분류를 선택해 주세요.",
      ),
    };
  }

  if (
    busType &&
    !validBusTypes.includes(busType)
  ) {
    return {
      success: false,
      state: errorState(
        "올바른 버스 유형을 선택해 주세요.",
      ),
    };
  }

  if (
    title.length < 2 ||
    title.length > 100
  ) {
    return {
      success: false,
      state: errorState(
        "제목은 2자 이상 100자 이하로 입력해 주세요.",
      ),
    };
  }

  if (
    content.length < 5 ||
    content.length > 5000
  ) {
    return {
      success: false,
      state: errorState(
        "내용은 5자 이상 5000자 이하로 입력해 주세요.",
      ),
    };
  }

  return {
    success: true,
    category,
    busType,
    title,
    content,
  };
}

function successState(
  message: string,
): PostActionState {
  return {
    status: "success",
    message,
  };
}

function errorState(
  message: string,
): PostActionState {
  return {
    status: "error",
    message,
  };
}
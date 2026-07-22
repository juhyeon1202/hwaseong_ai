"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
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

const validCategories = [
  "route_request",
  "route_suggestion",
  "information",
  "question",
];

const validBusTypes = [
  "city",
  "village",
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
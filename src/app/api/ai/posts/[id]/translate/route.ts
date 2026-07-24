import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  GEMINI_MODEL,
  generateGeminiJson,
} from "@/lib/gemini";
import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TranslateRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TargetLanguage =
  | "en"
  | "ja"
  | "zh";

type TranslationResult = {
  translatedTitle: string;
  translatedContent: string;
};

const languageLabels: Record<
  TargetLanguage,
  string
> = {
  en: "English",
  ja: "Japanese",
  zh: "Simplified Chinese",
};

function isTargetLanguage(
  value: unknown,
): value is TargetLanguage {
  return (
    value === "en" ||
    value === "ja" ||
    value === "zh"
  );
}

export async function POST(
  request: NextRequest,
  context: TranslateRouteContext,
) {
  try {
    const { id } =
      await context.params;

    const body =
      (await request.json()) as {
        language?: unknown;
      };

    if (
      !isTargetLanguage(
        body.language,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "지원하지 않는 번역 언어입니다.",
        },
        {
          status: 400,
        },
      );
    }

    const language =
      body.language;

    /*
     * 이미 번역한 결과가 있으면
     * Gemini를 다시 호출하지 않습니다.
     */
    const {
      data: cachedTranslation,
    } = await supabaseAdmin
      .from("post_translations")
      .select(
        `
          translated_title,
          translated_content,
          model
        `,
      )
      .eq("post_id", id)
      .eq("language", language)
      .maybeSingle();

    if (cachedTranslation) {
      return NextResponse.json({
        success: true,
        cached: true,
        language,
        translatedTitle:
          cachedTranslation.translated_title,
        translatedContent:
          cachedTranslation.translated_content,
        model:
          cachedTranslation.model,
      });
    }

    const {
      data: post,
      error: postError,
    } = await supabaseAdmin
      .from("posts")
      .select(
        `
          id,
          title,
          content,
          is_hidden
        `,
      )
      .eq("id", id)
      .eq("is_hidden", false)
      .maybeSingle();

    if (
      postError ||
      !post
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "번역할 게시글을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const result =
      await generateGeminiJson<TranslationResult>(
        {
          systemInstruction: [
            "당신은 화성시 교통 플랫폼의 전문 번역가입니다.",
            "한국어 교통 안내 게시글을 지정된 언어로 자연스럽고 정확하게 번역하세요.",
            "정류장명, 역명, 지역명, 노선번호와 서비스명은 원문의 의미를 유지하세요.",
            "원문에 없는 정보나 교통 상황을 새로 만들어내지 마세요.",
            "요약하거나 문단을 삭제하지 말고 원문의 문단 구조를 유지하세요.",
            "응답은 반드시 JSON 형식으로만 반환하세요.",
          ].join(" "),
          prompt: `
다음 한국어 게시글을 ${languageLabels[language]}로 번역해 주세요.

반환 형식:
{
  "translatedTitle": "번역된 제목",
  "translatedContent": "번역된 본문"
}

[한국어 제목]
${post.title}

[한국어 본문]
${post.content}
          `.trim(),
        },
      );

    if (
      !result.translatedTitle?.trim() ||
      !result.translatedContent?.trim()
    ) {
      throw new Error(
        "Gemini가 올바른 번역 결과를 반환하지 않았습니다.",
      );
    }

    const translatedTitle =
      result.translatedTitle.trim();

    const translatedContent =
      result.translatedContent.trim();

    const {
      error: saveError,
    } = await supabaseAdmin
      .from("post_translations")
      .upsert(
        {
          post_id: id,
          language,
          translated_title:
            translatedTitle,
          translated_content:
            translatedContent,
          model: GEMINI_MODEL,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "post_id,language",
        },
      );

    if (saveError) {
      console.error(
        "[Post translation cache save error]",
        saveError,
      );
    }

    return NextResponse.json({
      success: true,
      cached: false,
      language,
      translatedTitle,
      translatedContent,
      model: GEMINI_MODEL,
    });
  } catch (error) {
    console.error(
      "[Post AI translation error]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "게시글 번역 중 오류가 발생했습니다.";

    const isQuotaError =
      message.includes("429") ||
      message.includes(
        "RESOURCE_EXHAUSTED",
      ) ||
      message
        .toLowerCase()
        .includes("quota");

    return NextResponse.json(
      {
        success: false,
        quotaExceeded:
          isQuotaError,
        message: isQuotaError
          ? "현재 사용할 수 있는 AI 번역 할당량을 모두 사용했습니다. 잠시 후 다시 시도해 주세요."
          : message,
      },
      {
        status: isQuotaError
          ? 429
          : 500,
      },
    );
  }
}
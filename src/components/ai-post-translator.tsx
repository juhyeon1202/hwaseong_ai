"use client";

import {
  useState,
} from "react";

type TargetLanguage =
  | "en"
  | "ja"
  | "zh";

type Translation = {
  translatedTitle: string;
  translatedContent: string;
  cached: boolean;
  model?: string;
};

type AiPostTranslatorProps = {
  postId: string;
  variant?: "card" | "detail";
};

const languageOptions: {
  value: TargetLanguage;
  label: string;
}[] = [
  {
    value: "en",
    label: "English",
  },
  {
    value: "ja",
    label: "日本語",
  },
  {
    value: "zh",
    label: "中文",
  },
];

export function AiPostTranslator({
  postId,
  variant = "detail",
}: AiPostTranslatorProps) {
  const [
    language,
    setLanguage,
  ] =
    useState<TargetLanguage>("en");

  const [
    translations,
    setTranslations,
  ] = useState<
    Partial<
      Record<
        TargetLanguage,
        Translation
      >
    >
  >({});

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const translation =
    translations[language];

  async function translatePost() {
    if (translation) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/ai/posts/${postId}/translate`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            language,
          }),
        },
      );

      const result =
        (await response.json()) as {
          success?: boolean;
          message?: string;
          cached?: boolean;
          translatedTitle?: string;
          translatedContent?: string;
          model?: string;
        };

      if (
        !response.ok ||
        !result.success ||
        !result.translatedTitle ||
        !result.translatedContent
      ) {
        throw new Error(
          result.message ??
            "게시글을 번역하지 못했습니다.",
        );
      }

      setTranslations(
        (current) => ({
          ...current,
          [language]: {
            translatedTitle:
              result.translatedTitle!,
            translatedContent:
              result.translatedContent!,
            cached:
              Boolean(
                result.cached,
              ),
            model:
              result.model,
          },
        }),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "게시글을 번역하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  function changeLanguage(
    value: TargetLanguage,
  ) {
    setLanguage(value);
    setErrorMessage("");
  }

  const isCard =
    variant === "card";

  return (
    <section
      className={
        isCard
          ? "border-t border-line-light bg-[#fbfcff] px-5 py-4 md:px-7"
          : "mt-6 rounded-control border border-[#dbe2ff] bg-[#f7f9ff] p-4 sm:p-5"
      }
      aria-label="AI 게시글 번역"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-[#edf1ff] px-3 py-1 text-xs font-bold text-[#536de8]">
            Gemini AI
          </span>

          {!isCard && (
            <span className="text-sm font-semibold text-main">
              게시글 번역
            </span>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={language}
            onChange={(event) =>
              changeLanguage(
                event.target
                  .value as TargetLanguage,
              )
            }
            className="min-h-10 rounded-[10px] border border-line bg-white px-3 text-sm text-main outline-none focus:border-[#6677e8]"
            aria-label="번역 언어 선택"
          >
            {languageOptions.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              ),
            )}
          </select>

          <button
            type="button"
            onClick={
              translatePost
            }
            disabled={
              loading ||
              Boolean(translation)
            }
            className="inline-flex min-h-10 items-center justify-center rounded-[10px] bg-[#596ee8] px-4 text-sm font-bold text-white transition hover:bg-[#485dcc] disabled:cursor-not-allowed disabled:bg-[#aeb8e8]"
          >
            {loading
              ? "번역 중..."
              : translation
                ? "번역 완료"
                : "AI 번역"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <p className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {translation && (
        <div className="mt-4 rounded-[12px] border border-[#e0e5f8] bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <strong
              className={
                isCard
                  ? "line-clamp-2 text-base text-main"
                  : "text-lg text-main"
              }
            >
              {
                translation.translatedTitle
              }
            </strong>

            <span className="ml-auto text-xs text-muted">
              {translation.cached
                ? "저장된 번역"
                : "AI 신규 번역"}
            </span>
          </div>

          <p
            className={
              isCard
                ? "mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-secondary"
                : "mt-4 whitespace-pre-wrap text-sm leading-7 text-secondary"
            }
          >
            {
              translation.translatedContent
            }
          </p>
        </div>
      )}
    </section>
  );
}
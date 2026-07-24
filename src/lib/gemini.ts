import "server-only";

import { GoogleGenAI } from "@google/genai";

const apiKey =
  process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY 환경변수가 설정되지 않았습니다.",
  );
}

export const gemini =
  new GoogleGenAI({
    apiKey,
  });

export const GEMINI_MODEL =
  process.env.GEMINI_MODEL ??
  "gemini-3.5-flash-lite";

export const GEMINI_SEARCH_MODEL =
  process.env.GEMINI_SEARCH_MODEL ??
  "gemini-3.1-flash-lite";

type GenerateTextOptions = {
  prompt: string;
  systemInstruction?: string;
};

type GenerateJsonOptions = {
  prompt: string;
  systemInstruction?: string;
};

type GenerateSearchOptions = {
  prompt: string;
  systemInstruction?: string;
};

export async function generateGeminiText({
  prompt,
  systemInstruction,
}: GenerateTextOptions): Promise<string> {
  const response =
    await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

  const text =
    response.text?.trim();

  if (!text) {
    throw new Error(
      "Gemini가 응답 내용을 반환하지 않았습니다.",
    );
  }

  return text;
}

export async function generateGeminiJson<T>({
  prompt,
  systemInstruction,
}: GenerateJsonOptions): Promise<T> {
  const response =
    await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType:
          "application/json",
      },
    });

  const text =
    response.text?.trim();

  if (!text) {
    throw new Error(
      "Gemini가 JSON 응답을 반환하지 않았습니다.",
    );
  }

  const normalizedText =
    removeMarkdownCodeFence(text);

  try {
    return JSON.parse(
      normalizedText,
    ) as T;
  } catch (error) {
    console.error(
      "[Gemini JSON parse error]",
      {
        text,
        error,
      },
    );

    throw new Error(
      "Gemini 응답을 JSON으로 변환하지 못했습니다.",
    );
  }
}

function removeMarkdownCodeFence(
  value: string,
) {
  return value
    .replace(
      /^```(?:json)?\s*/i,
      "",
    )
    .replace(/\s*```$/i, "")
    .trim();
}

export async function generateGeminiSearchText({
  prompt,
  systemInstruction,
}: GenerateSearchOptions): Promise<string> {
  try {
    const response =
      await gemini.models.generateContent({
        model: GEMINI_SEARCH_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          tools: [
            {
              googleSearch: {},
            },
          ],
        },
      });

    const text =
      response.text?.trim();

    if (!text) {
      throw new Error(
        "Gemini 웹 검색이 응답 내용을 반환하지 않았습니다.",
      );
    }

    return text;
  } catch (error) {
    if (shouldFallbackWithoutSearch(error)) {
      console.warn(
        "[Gemini Search unavailable; using non-grounded fallback]",
        getErrorMessage(error),
      );

      return generateGeminiText({
        prompt: createNonSearchFallbackPrompt(prompt),
        systemInstruction,
      });
    }

    throw normalizeGeminiSearchError(
      error,
    );
  }
}

export async function generateGeminiSearchJson<T>({
  prompt,
  systemInstruction,
}: GenerateSearchOptions): Promise<T> {
  try {
    const response =
      await gemini.models.generateContent({
        model: GEMINI_SEARCH_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          tools: [
            {
              googleSearch: {},
            },
          ],
        },
      });

    const text =
      response.text?.trim();

    if (!text) {
      throw new Error(
        "Gemini 웹 검색이 JSON 응답을 반환하지 않았습니다.",
      );
    }

    const normalizedText =
      removeMarkdownCodeFence(text);

    try {
      return JSON.parse(
        normalizedText,
      ) as T;
    } catch (error) {
      console.error(
        "[Gemini grounded JSON parse error]",
        {
          text,
          error,
        },
      );

      throw new Error(
        "Gemini 웹 검색 응답을 JSON으로 변환하지 못했습니다.",
      );
    }
  } catch (error) {
    if (shouldFallbackWithoutSearch(error)) {
      console.warn(
        "[Gemini Search unavailable; using non-grounded JSON fallback]",
        getErrorMessage(error),
      );

      return generateGeminiJson<T>({
        prompt: createNonSearchFallbackPrompt(prompt),
        systemInstruction,
      });
    }

    throw normalizeGeminiSearchError(
      error,
    );
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error);
}

function shouldFallbackWithoutSearch(
  error: unknown,
) {
  const message =
    getErrorMessage(error).toLowerCase();

  if (
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("quota")
  ) {
    return false;
  }

  return (
    message.includes("404") ||
    message.includes("403") ||
    message.includes("not_found") ||
    message.includes("permission_denied") ||
    message.includes("not available") ||
    message.includes("google search") ||
    message.includes("googlesearch") ||
    message.includes("tool")
  );
}

function createNonSearchFallbackPrompt(
  prompt: string,
) {
  return `
[중요한 실행 조건]
현재 Google 검색 Grounding을 사용할 수 없습니다.
제공된 내부 데이터만 분석하고, 외부 뉴스·날씨·교통 정보를 추측하거나 지어내지 마세요.
확인할 수 없는 외부 정보는 반드시 "외부 실시간 정보 확인 불가"라고 명시하세요.
출처를 요구받은 경우 실제로 제공된 출처만 사용하고, 없는 출처를 생성하지 마세요.

${prompt}
  `.trim();
}

function normalizeGeminiSearchError(
  error: unknown,
) {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  if (
    message.includes("429") ||
    message.includes(
      "RESOURCE_EXHAUSTED",
    ) ||
    message.toLowerCase().includes(
      "quota",
    )
  ) {
    return new Error(
      "오늘 사용할 수 있는 무료 AI 웹 검색 횟수를 모두 사용했습니다. 할당량이 초기화된 후 다시 시도해 주세요.",
    );
  }

  return error instanceof Error
    ? error
    : new Error(
        "Gemini 웹 검색 중 알 수 없는 오류가 발생했습니다.",
      );
}

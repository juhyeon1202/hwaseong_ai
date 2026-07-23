import "server-only";

import { GoogleGenAI } from "@google/genai";

const apiKey =
  process.env.GEMINI_API_KEY;

const model =
  process.env.GEMINI_MODEL ??
  "gemini-3.5-flash-lite";

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
  model;

type GenerateTextOptions = {
  prompt: string;
  systemInstruction?: string;
};

type GenerateJsonOptions = {
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
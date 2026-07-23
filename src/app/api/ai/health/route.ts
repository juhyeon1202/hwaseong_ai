import { NextResponse } from "next/server";

import {
  GEMINI_MODEL,
  generateGeminiText,
} from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await generateGeminiText({
      systemInstruction: [
        "당신은 화성시 시민 참여형 교통 플랫폼의 AI입니다.",
        "응답은 반드시 간단한 한국어 한 문장으로 작성합니다.",
      ].join(" "),
      prompt: [
        "Gemini API 연결 상태를 확인하고 있습니다.",
        "연결 성공이라는 의미가 포함된 문장으로 답변하세요.",
      ].join(" "),
    });

    return NextResponse.json({
      success: true,
      model: GEMINI_MODEL,
      message: result,
    });
  } catch (error) {
    console.error("[Gemini health check error]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Gemini API 연결 중 알 수 없는 오류가 발생했습니다.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      },
    );
  }
}
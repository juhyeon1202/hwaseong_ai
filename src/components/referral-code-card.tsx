"use client";

import { useState } from "react";

import { Card, SectionHeader } from "@/components/ui";

type ReferralCodeCardProps = {
  referralCode: string;
};

export function ReferralCodeCard({
  referralCode,
}: ReferralCodeCardProps) {
  const [copied, setCopied] =
    useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        referralCode,
      );

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        2000,
      );
    } catch {
      // 클립보드 접근이 막힌 환경(권한 거부 등)에서는
      // 조용히 무시합니다. 코드는 화면에 그대로 보입니다.
    }
  }

  return (
    <Card>
      <SectionHeader
        title="내 추천인 코드"
        description="친구에게 코드를 공유하면 가입 완료 시 서로 300P가 지급됩니다."
      />

      <div className="mt-5 flex items-center gap-3">
        <p className="flex-1 rounded-control border border-line bg-surface-muted px-4 py-3 text-center text-xl font-bold tracking-[0.2em] text-brand-text">
          {referralCode}
        </p>

        <button
          type="button"
          onClick={handleCopy}
          className="flex min-h-12 shrink-0 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
    </Card>
  );
}

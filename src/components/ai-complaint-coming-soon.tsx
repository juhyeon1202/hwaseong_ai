"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";

import { ActionResultModal } from "@/components/action-result-modal";

export function AiComplaintComingSoon() {
  const t = useTranslations("Account");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-sm font-semibold text-secondary hover:bg-surface-muted hover:text-main"
      >
        {t("aiComplaint")}
      </button>

      {mounted &&
        createPortal(
          <ActionResultModal
            open={open}
            title="AI 민원 작성 서비스 준비 중"
            message="교통일지와 불편 신고 내용을 바탕으로 민원 초안을 자동으로 작성하는 기능을 준비하고 있습니다."
            onConfirm={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

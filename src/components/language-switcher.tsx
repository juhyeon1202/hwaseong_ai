"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

const localeOptions = ["ko", "en", "zh", "ja"] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Language");
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isPending, startTransition] = useTransition();

  function changeLocale(nextLocale: string) {
    document.cookie = `app_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = nextLocale;
    detailsRef.current?.removeAttribute("open");
    startTransition(() => router.refresh());
  }

  return (
    <details ref={detailsRef} className="group relative shrink-0">
      <summary
        aria-label={t("label")}
        title={t("label")}
        className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-white text-lg hover:border-brand hover:bg-surface-muted [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true">🌐</span>
      </summary>

      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-36 overflow-hidden rounded-card border border-line bg-white p-1.5 shadow-floating">
        {localeOptions.map((option) => (
          <button
            key={option}
            type="button"
            disabled={isPending}
            onClick={() => changeLocale(option)}
            className={[
              "flex min-h-10 w-full items-center rounded-control px-3 text-left text-sm font-semibold",
              locale === option
                ? "bg-brand-soft text-brand-text"
                : "text-secondary hover:bg-surface-muted hover:text-main",
            ].join(" ")}
          >
            {t(option)}
          </button>
        ))}
      </div>
    </details>
  );
}

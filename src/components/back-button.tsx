"use client";

import { usePathname, useRouter } from "next/navigation";

type BackButtonProps = {
  fallbackHref?: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
};

export function BackButton({
  fallbackHref = "/",
  label = "뒤로",
  showLabel = true,
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      className={[
        "inline-flex min-h-11 items-center gap-2 rounded-control px-2",
        "text-sm font-semibold text-secondary",
        "transition-colors hover:bg-surface-muted hover:text-main",
        className,
      ].join(" ")}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>

      {showLabel && <span>{label}</span>}
    </button>
  );
}

export function PageBackButton() {
  const pathname = usePathname();

  // 메인 페이지에서만 백 버튼을 숨깁니다.
  if (pathname === "/") {
    return null;
  }

  return (
    <BackButton
      fallbackHref={getFallbackHref(pathname)}
      label="뒤로"
      showLabel
      className="-ml-4 w-auto sm:-ml-12 lg:-ml-20"
    />
  );
}

function getFallbackHref(pathname: string) {
  if (pathname.startsWith("/admin/incidents/")) {
    return "/admin/incidents";
  }

  if (pathname.startsWith("/admin/inquiries/")) {
    return "/admin/inquiries";
  }

  if (pathname !== "/admin" && pathname.startsWith("/admin")) {
    return "/admin";
  }

  if (pathname.startsWith("/community/")) {
    return "/community";
  }

  if (pathname.startsWith("/route-requests/")) {
    return "/route-requests";
  }

  if (pathname.startsWith("/incidents/")) {
    return "/incidents";
  }

  if (pathname.startsWith("/journal/")) {
    return "/journal";
  }

  if (pathname.startsWith("/auth")) {
    return "/";
  }

  return "/";
}
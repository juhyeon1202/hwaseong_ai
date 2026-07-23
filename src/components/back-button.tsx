"use client";

import {
  usePathname,
  useRouter,
} from "next/navigation";

type BackButtonProps = {
  fallbackHref?: string;
  label?: string;
  className?: string;
};

export function BackButton({
  fallbackHref = "/",
  label = "뒤로",
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
        "inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-sm font-semibold text-secondary hover:bg-surface-muted hover:text-main",
        className,
      ].join(" ")}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>

      <span>{label}</span>
    </button>
  );
}

export function PageBackButton() {
  const pathname = usePathname();

  if (
    pathname === "/" ||
    pathname === "/admin" ||
    pathname.startsWith("/auth")
  ) {
    return null;
  }

  return (
    <div className="mb-4">
      <BackButton
        fallbackHref={getFallbackHref(
          pathname,
        )}
      />
    </div>
  );
}

function getFallbackHref(
  pathname: string,
) {
  if (
    pathname.startsWith(
      "/admin/incidents/",
    )
  ) {
    return "/admin/incidents";
  }

  if (
    pathname.startsWith("/admin")
  ) {
    return "/admin";
  }

  if (
    pathname.startsWith(
      "/community/",
    )
  ) {
    return "/community";
  }

  if (
    pathname.startsWith(
      "/route-requests/",
    )
  ) {
    return "/route-requests";
  }

  if (
    pathname.startsWith(
      "/incidents/",
    )
  ) {
    return "/incidents";
  }

  return "/";
}
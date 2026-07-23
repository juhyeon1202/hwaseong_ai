"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavigationItem = {
  href: string;
  label: string;
  icon: ReactNode;
  matchPaths?: string[];
};

const primaryNavigation: NavigationItem[] = [
  {
    href: "/",
    label: "홈",
    matchPaths: ["/"],
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="m3 11 9-7 9 7" />
        <path d="M5.5 10v10h13V10" />
        <path d="M9.5 20v-6h5v6" />
      </svg>
    ),
  },
  {
    href: "/community",
    label: "게시판",
    matchPaths: [
      "/community",
      "/route-requests",
    ],
    icon: (
      <svg viewBox="0 0 24 24">
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="2"
        />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    href: "/journal",
    label: "일지",
    matchPaths: ["/journal"],
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M6 3.5h11a2 2 0 0 1 2 2V20H8a3 3 0 0 1-3-3V4.5a1 1 0 0 1 1-1Z" />
        <path d="M8 3.5V17a3 3 0 0 0-3 3" />
        <path d="M11 8h5M11 12h5" />
      </svg>
    ),
  },
  {
    href: "/mypage",
    label: "마이",
    matchPaths: [
      "/mypage",
      "/favorites",
      "/inquiries",
      "/rewards",
    ],
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-4 3.2-6 7-6s7 2 7 6" />
      </svg>
    ),
  },
];

const reportNavigation: NavigationItem = {
  href: "/report",
  label: "신고",
  matchPaths: [
    "/report",
    "/incidents",
  ],
  icon: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v6" />
      <path d="M12 17h.01" />
    </svg>
  ),
};

const mobileNavigation = [
  primaryNavigation[0],
  reportNavigation,
  primaryNavigation[1],
  primaryNavigation[2],
  primaryNavigation[3],
];

type AppNavigationProps = {
  isAdmin?: boolean;
};

export function DesktopNavigation({
  isAdmin = false,
}: AppNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="hidden items-center gap-1 md:flex"
    >
      {primaryNavigation.map((item) => (
        <DesktopNavigationLink
          key={item.href}
          item={item}
          pathname={pathname}
        />
      ))}

      <DesktopNavigationLink
        item={reportNavigation}
        pathname={pathname}
      />

      {isAdmin && (
        <Link
          href="/admin"
          aria-current={
            pathname.startsWith("/admin")
              ? "page"
              : undefined
          }
          className={[
            "relative ml-1 inline-flex",
            "min-h-11 items-center px-3",
            "text-sm font-semibold",
            "transition-colors",
            pathname.startsWith("/admin")
              ? "text-info"
              : "text-secondary hover:text-info",
          ].join(" ")}
        >
          관리자

          {pathname.startsWith(
            "/admin",
          ) && (
            <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-info" />
          )}
        </Link>
      )}
    </nav>
  );
}

function DesktopNavigationLink({
  item,
  pathname,
}: {
  item: NavigationItem;
  pathname: string;
}) {
  const isActive = matchesPath(
    pathname,
    item,
  );

  const isReport =
    item.href === "/report";

  return (
    <Link
      href={item.href}
      aria-current={
        isActive ? "page" : undefined
      }
      className={[
        "relative inline-flex min-h-11",
        "items-center gap-1.5 px-3",
        "text-sm font-semibold",
        "transition-colors",
        isActive
          ? "text-brand"
          : isReport
            ? "text-brand-text hover:text-brand"
            : "text-secondary hover:text-main",
      ].join(" ")}
    >
      {isReport && (
        <span
          className={[
            "block size-4",
            "[&_svg]:h-full",
            "[&_svg]:w-full",
            "[&_svg]:fill-none",
            "[&_svg]:stroke-current",
            "[&_svg]:stroke-2",
          ].join(" ")}
        >
          {item.icon}
        </span>
      )}

      {item.label}

      {isActive && (
        <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />
      )}
    </Link>
  );
}

export function MobileNavigation({
  isAdmin = false,
}: AppNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="모바일 주요 메뉴"
      className={[
        "fixed inset-x-0 bottom-0 z-50",
        "border-t border-line bg-white/95",
        "pb-[env(safe-area-inset-bottom)]",
        "backdrop-blur md:hidden",
      ].join(" ")}
    >
      <div className="mx-auto grid h-[68px] max-w-lg grid-cols-5">
        {mobileNavigation.map((item) => {
          const isAdminPage =
            item.href === "/mypage" &&
            isAdmin &&
            pathname.startsWith("/admin");

          const isActive =
            matchesPath(
              pathname,
              item,
            ) || isAdminPage;

          const href =
            item.href === "/mypage" &&
            isAdmin
              ? "/admin"
              : item.href;

          return (
            <Link
              key={item.href}
              href={href}
              aria-current={
                isActive
                  ? "page"
                  : undefined
              }
              className={[
                "flex min-h-11 flex-col",
                "items-center justify-center",
                "gap-1 transition-colors",
                isActive
                  ? isAdminPage
                    ? "text-info"
                    : "text-brand"
                  : "text-muted active:bg-surface-muted",
              ].join(" ")}
            >
              <span
                className={[
                  "block size-5",
                  "[&_svg]:h-full",
                  "[&_svg]:w-full",
                  "[&_svg]:fill-none",
                  "[&_svg]:stroke-current",
                  "[&_svg]:stroke-[1.8]",
                  "[&_svg]:stroke-linecap-round",
                  "[&_svg]:stroke-linejoin-round",
                ].join(" ")}
              >
                {item.icon}
              </span>

              <span className="text-[11px] font-semibold">
                {isAdminPage
                  ? "관리자"
                  : item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function matchesPath(
  pathname: string,
  item: NavigationItem,
) {
  const paths =
    item.matchPaths ?? [item.href];

  return paths.some((path) => {
    if (path === "/") {
      return pathname === "/";
    }

    return (
      pathname === path ||
      pathname.startsWith(
        `${path}/`,
      )
    );
  });
}
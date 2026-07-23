"use client";

import Link from "next/link";
import {
  usePathname,
} from "next/navigation";
import type {
  ReactNode,
} from "react";

const adminMenus = [
  {
    href: "/admin",
    label: "대시보드",
    description:
      "전체 현황",
    icon: "dashboard",
  },
  {
    href:
      "/admin/incidents",
    label: "교통 사건",
    description:
      "신고·AI 감지",
    icon: "incident",
  },
  {
    href:
      "/admin/route-requests",
    label: "희망 노선",
    description:
      "시민 제안 검토",
    icon: "route",
  },
  {
    href:
      "/admin/inquiries",
    label: "1:1 문의",
    description:
      "시민 문의 답변",
    icon: "inquiry",
  },
  {
    href:
      "/admin/post-reports",
    label: "게시물 신고",
    description:
      "게시판 신고 검토",
    icon: "flag",
  },
  {
    href:
      "/admin/users",
    label: "회원 관리",
    description:
      "관리자 권한 설정",
    icon: "users",
  },
] as const;

type AdminIcon =
  (typeof adminMenus)[number]["icon"];

export function AdminNav() {
  const pathname =
    usePathname();

  return (
    <aside className="h-fit self-start overflow-hidden rounded-control border border-line bg-surface shadow-card lg:sticky lg:top-24 lg:w-64 lg:shrink-0">
      <div className="hidden border-b border-line px-5 py-6 lg:block">
        <span className="text-xs font-bold text-brand-text">
          ADMIN
        </span>

        <h2 className="mt-2 text-xl font-bold text-main">
          관리자
        </h2>

        <p className="mt-1 text-xs leading-5 text-muted">
          화성 교통일지
          운영 관리
        </p>
      </div>

      <nav
        aria-label="관리자 메뉴"
        className="flex gap-2 overflow-x-auto px-4 py-3 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-3 lg:py-4"
      >
        {adminMenus.map(
          (menu) => {
            const active =
              isMenuActive(
                pathname,
                menu.href,
              );

            return (
              <Link
                key={
                  menu.href
                }
                href={
                  menu.href
                }
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                className={[
                  "group flex min-h-14 shrink-0 items-center gap-3 rounded-control border px-4 transition-colors",
                  "lg:w-full",
                  active
                    ? "border-brand-line bg-brand-soft text-brand-text"
                    : "border-transparent text-secondary hover:border-brand-line hover:bg-brand-softer hover:text-brand-text",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-9 shrink-0 items-center justify-center rounded-control transition-colors",
                    active
                      ? "bg-brand text-on-brand"
                      : "bg-surface-muted text-muted group-hover:bg-brand-soft group-hover:text-brand-text",
                  ].join(" ")}
                >
                  <AdminMenuIcon
                    icon={
                      menu.icon
                    }
                  />
                </span>

                <span className="text-left">
                  <strong className="block whitespace-nowrap text-sm">
                    {menu.label}
                  </strong>

                  <span
                    className={[
                      "mt-0.5 hidden whitespace-nowrap text-[11px] sm:block",
                      active
                        ? "text-brand-text"
                        : "text-muted group-hover:text-brand-text",
                    ].join(" ")}
                  >
                    {
                      menu.description
                    }
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className={[
                    "ml-auto hidden text-lg lg:block",
                    active
                      ? "text-brand-text"
                      : "text-transparent group-hover:text-brand-text",
                  ].join(" ")}
                >
                  ›
                </span>
              </Link>
            );
          },
        )}
      </nav>

      <div className="mx-4 mt-auto mb-4 hidden rounded-card border border-brand-line bg-brand-softer p-4 lg:block">
        <p className="text-xs font-bold text-brand-text">
          AI 관리자 지원
        </p>

        <p className="mt-2 text-xs leading-5 text-secondary">
          AI 분석 결과는
          참고 자료이며 최종
          처리는 관리자가
          결정합니다.
        </p>

        <Link
          href="/admin/incidents"
          className="mt-3 inline-flex text-xs font-bold text-brand-text"
        >
          검토 대기 사건 보기 →
        </Link>
      </div>
    </aside>
  );
}

function isMenuActive(
  pathname: string,
  href: string,
) {
  if (href === "/admin") {
    return (
      pathname === "/admin"
    );
  }

  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`,
    )
  );
}

function AdminMenuIcon({
  icon,
}: {
  icon: AdminIcon;
}) {
  const commonProps = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    className: "size-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
  };

  if (
    icon === "dashboard"
  ) {
    return (
      <svg {...commonProps}>
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="1"
        />

        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="1"
        />

        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="1"
        />

        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="1"
        />
      </svg>
    );
  }

  if (
    icon === "incident"
  ) {
    return (
      <svg {...commonProps}>
        <path d="M12 3 2.8 19a1.4 1.4 0 0 0 1.2 2h16a1.4 1.4 0 0 0 1.2-2Z" />

        <path d="M12 9v4" />

        <path d="M12 17h.01" />
      </svg>
    );
  }

  if (
    icon === "route"
  ) {
    return (
      <svg {...commonProps}>
        <circle
          cx="6"
          cy="18"
          r="2"
        />

        <circle
          cx="18"
          cy="6"
          r="2"
        />

        <path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h1" />

        <path d="m14 4 2 2-2 2" />
      </svg>
    );
  }

  if (
    icon === "inquiry"
  ) {
    return (
      <svg {...commonProps}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />

        <path d="M8 9h8" />

        <path d="M8 13h5" />
      </svg>
    );
  }

  if (
    icon === "flag"
  ) {
    return (
      <svg {...commonProps}>
        <path d="M5 3v18" />

        <path d="M5 4h11l-2.5 4L16 12H5" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />

      <circle
        cx="9"
        cy="7"
        r="4"
      />

      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />

      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
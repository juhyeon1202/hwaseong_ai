"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminMenus = [
  {
    href: "/admin",
    label: "대시보드",
    description: "전체 현황",
    icon: "dashboard",
  },
  {
    href: "/admin/incidents",
    label: "교통 사건",
    description: "신고·AI 감지",
    icon: "incident",
  },
  {
    href: "/admin/route-requests",
    label: "희망 노선",
    description: "시민 제안 검토",
    icon: "route",
  },
  {
    href: "/admin/inquiries",
    label: "1:1 문의",
    description: "시민 문의 답변",
    icon: "inquiry",
  },
] as const;

type AdminIcon =
  (typeof adminMenus)[number]["icon"];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="관리자 메뉴"
      className="border-b border-line bg-surface"
    >
      <div className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        {adminMenus.map((menu) => {
          const active =
            menu.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(
                  menu.href,
                );

          return (
            <Link
              key={menu.href}
              href={menu.href}
              aria-current={
                active
                  ? "page"
                  : undefined
              }
              className={[
                "flex min-h-14 shrink-0 items-center gap-3 rounded-control border px-4 transition-colors",
                active
                  ? "border-info bg-info-soft text-info"
                  : "border-transparent text-secondary hover:border-line hover:bg-surface-muted",
              ].join(" ")}
            >
              <span
                className={[
                  "flex size-9 shrink-0 items-center justify-center rounded-control",
                  active
                    ? "bg-info text-white"
                    : "bg-surface-muted text-muted",
                ].join(" ")}
              >
                <AdminMenuIcon
                  icon={menu.icon}
                />
              </span>

              <span>
                <strong className="block text-sm">
                  {menu.label}
                </strong>

                <span
                  className={[
                    "mt-0.5 hidden text-[11px] sm:block",
                    active
                      ? "text-info"
                      : "text-muted",
                  ].join(" ")}
                >
                  {menu.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AdminMenuIcon({
  icon,
}: {
  icon: AdminIcon;
}) {
  if (icon === "dashboard") {
    return (
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

  if (icon === "incident") {
    return (
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
        <path d="M12 3 2.8 19a1.4 1.4 0 0 0 1.2 2h16a1.4 1.4 0 0 0 1.2-2Z" />

        <path d="M12 9v4" />

        <path d="M12 17h.01" />
      </svg>
    );
  }

  if (icon === "route") {
    return (
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

        <path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" />

        <path d="m14 15 2 2-2 2" />
      </svg>
    );
  }

  return (
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
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />

      <path d="M8 9h8" />

      <path d="M8 13h5" />
    </svg>
  );
}
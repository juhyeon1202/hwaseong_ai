import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  signOut,
  type CurrentUser,
} from "@/lib/auth";

import { PageBackButton } from "@/components/back-button";

type AppShellProps = {
  children: ReactNode;
  user: CurrentUser | null;
};

type NavigationItem = {
  href: string;
  label: string;
  icon:
    | "home"
    | "journal"
    | "report"
    | "community"
    | "user";
};

const navigation: NavigationItem[] = [
  {
    href: "/",
    label: "홈",
    icon: "home",
  },
  {
    href: "/journal",
    label: "교통일지",
    icon: "journal",
  },
  {
    href: "/report",
    label: "신고",
    icon: "report",
  },
  {
    href: "/community",
    label: "게시판",
    icon: "community",
  },
  {
    href: "/mypage",
    label: "마이",
    icon: "user",
  },
];

export function AppShell({
  children,
  user,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <AppHeader user={user} />

      <main className="mx-auto w-full max-w-[var(--app-content-width)] flex-1 px-4 pb-[calc(var(--app-bottom-nav-height)+24px)] pt-5 sm:px-6 md:pb-10 md:pt-8">
        <PageBackButton />

        {children}
      </main>

      <AppFooter />

      <MobileNavigation user={user} />
    </div>
  );
}

type AppHeaderProps = {
  user: CurrentUser | null;
};

function AppHeader({
  user,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line-light bg-surface/95 backdrop-blur">
      <div className="mx-auto flex min-h-[var(--app-header-height)] max-w-[var(--app-content-width)] items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="화성 교통일지 홈"
          className="flex min-w-0 items-center gap-3"
        >
          <Image
            src="/hwaseong-logo.jpg"
            alt="화성특례시"
            width={164}
            height={48}
            priority
            className="h-10 w-auto max-w-[132px] object-contain sm:max-w-[164px]"
          />

          <span className="hidden border-l border-line pl-3 lg:block">
            <strong className="block text-sm font-bold text-main">
              교통일지
            </strong>

            <span className="mt-0.5 block text-[11px] text-muted">
              시민 참여형 교통 플랫폼
            </span>
          </span>
        </Link>

        <DesktopNavigation
          isAdmin={user?.role === "admin"}
        />

        <HeaderAccount user={user} />
      </div>
    </header>
  );
}

function HeaderAccount({
  user,
}: AppHeaderProps) {
  if (!user) {
    return (
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href="/auth?mode=login"
          className="flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-secondary hover:bg-surface-muted"
        >
          로그인
        </Link>

        <Link
          href="/auth?mode=signup"
          className="hidden min-h-11 items-center rounded-control bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hover sm:flex"
        >
          회원가입
        </Link>
      </div>
    );
  }

  const initial =
    user.nickname
      .trim()
      .slice(0, 1)
      .toUpperCase() || "시";

  return (
    <details className="group relative shrink-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control px-2 hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 items-center justify-center rounded-pill bg-brand-soft text-sm font-bold text-brand-text">
          {initial}
        </span>

        <span className="hidden max-w-28 truncate text-sm font-semibold text-main sm:block">
          {user.nickname}
        </span>

        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="hidden size-4 text-muted transition-transform group-open:rotate-180 sm:block"
        >
          <path
            d="m5 7.5 5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-card border border-line bg-surface p-2 shadow-floating">
        <div className="border-b border-line-light px-3 py-3">
          <p className="truncate text-sm font-bold text-main">
            {user.nickname}
          </p>

          <p className="mt-1 truncate text-xs text-muted">
            {user.email ?? "이메일 정보 없음"}
          </p>

          <p className="mt-2 text-xs font-semibold text-brand-text">
            {user.points.toLocaleString()}P
          </p>
        </div>

        <div className="py-2">
          <MenuLink
            href="/mypage"
            label="마이페이지"
          />

          <MenuLink
            href="/favorites"
            label="즐겨찾기"
          />

          <MenuLink
            href="/inquiries"
            label="1:1 문의"
          />

          {user.role === "admin" && (
            <>
              <MenuLink
                href="/admin"
                label="관리자 대시보드"
                variant="admin"
              />

              <MenuLink
                href="/admin/inquiries"
                label="관리자 문의 관리"
                variant="admin"
              />
            </>
          )}
        </div>

        <form
          action={signOut}
          className="border-t border-line-light pt-2"
        >
          <button
            type="submit"
            className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
          >
            로그아웃
          </button>
        </form>
      </div>
    </details>
  );
}

type MenuLinkProps = {
  href: string;
  label: string;
  variant?: "default" | "admin";
};

function MenuLink({
  href,
  label,
  variant = "default",
}: MenuLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "flex min-h-11 items-center rounded-control px-3 text-sm font-semibold",
        variant === "admin"
          ? "bg-info-soft text-info"
          : "text-secondary hover:bg-surface-muted hover:text-main",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

type DesktopNavigationProps = {
  isAdmin: boolean;
};

function DesktopNavigation({
  isAdmin,
}: DesktopNavigationProps) {
  return (
    <nav
      aria-label="주요 메뉴"
      className="hidden items-center gap-1 md:flex"
    >
      {navigation
        .filter(
          (item) =>
            item.href !== "/mypage",
        )
        .map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-control px-3 py-2 text-sm font-semibold text-secondary hover:bg-surface-muted hover:text-main"
          >
            {item.label}
          </Link>
        ))}

      {isAdmin && (
        <Link
          href="/admin"
          className="rounded-control bg-info-soft px-3 py-2 text-sm font-semibold text-info"
        >
          관리자
        </Link>
      )}
    </nav>
  );
}

type MobileNavigationProps = {
  user: CurrentUser | null;
};

function MobileNavigation({
  user,
}: MobileNavigationProps) {
  return (
    <nav
      aria-label="모바일 주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden"
    >
      <div className="mx-auto grid h-[var(--app-bottom-nav-height)] max-w-lg grid-cols-5">
        {navigation.map((item) => {
          const href =
            item.href === "/mypage" &&
            user?.role === "admin"
              ? "/admin"
              : item.href;

          return (
            <Link
              key={item.href}
              href={href}
              className="flex min-h-11 flex-col items-center justify-center gap-1 text-muted active:bg-surface-muted active:text-brand-text"
            >
              <NavigationIcon
                icon={item.icon}
              />

              <span className="text-[11px] font-semibold">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NavigationIcon({
  icon,
}: {
  icon: NavigationItem["icon"];
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    className: "size-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
    "aria-hidden": true,
  };

  if (icon === "home") {
    return (
      <svg {...commonProps}>
        <path d="m3 11 9-7 9 7" />
        <path d="M5.5 10v10h13V10" />
        <path d="M9.5 20v-6h5v6" />
      </svg>
    );
  }

  if (icon === "journal") {
    return (
      <svg {...commonProps}>
        <path d="M6 3.5h11a2 2 0 0 1 2 2V20H8a3 3 0 0 1-3-3V4.5a1 1 0 0 1 1-1Z" />
        <path d="M8 3.5V17a3 3 0 0 0-3 3" />
        <path d="M11 8h5M11 12h5" />
      </svg>
    );
  }

  if (icon === "report") {
    return (
      <svg {...commonProps}>
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v5" />
        <path d="M12 17.2h.01" />
      </svg>
    );
  }

  if (icon === "community") {
    return (
      <svg {...commonProps}>
        <path d="M4 5.5h16v11H9l-5 4v-15Z" />
        <path d="M8 9h8M8 12.5h5" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle
        cx="12"
        cy="8"
        r="3.5"
      />
      <path d="M5 20c0-4 3.2-6 7-6s7 2 7 6" />
    </svg>
  );
}

function AppFooter() {
  return (
    <footer className="hidden border-t border-line-light bg-surface md:block">
      <div className="mx-auto grid max-w-[var(--app-content-width)] gap-8 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex items-center gap-4">
            <Image
              src="/hwaseong-logo.jpg"
              alt="화성특례시"
              width={164}
              height={48}
              className="h-10 w-auto object-contain"
            />

            <div className="border-l border-line pl-4">
              <strong className="block text-sm text-main">
                화성 교통일지
              </strong>

              <span className="mt-1 block text-xs text-muted">
                시민 참여형 대중교통 플랫폼
              </span>
            </div>
          </div>

          <address className="mt-5 not-italic text-sm leading-6 text-muted">
            (우)18274 경기도 화성시 남양읍
            시청로 159
          </address>

          <p className="mt-2 text-xs text-muted">
            본 서비스는 화성시 AI 공모전
            프로토타입입니다.
          </p>
        </div>

        <div className="flex flex-col items-start gap-5 lg:items-end">
          <nav
            aria-label="관련 링크"
            className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-secondary"
          >
            <a
              href="https://www.hscity.go.kr/www/index.do"
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand-text"
            >
              화성특례시청
            </a>

            <a
              href="https://www.instagram.com/hwaseong_city/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand-text"
            >
              인스타그램
            </a>

            <Link
              href="/privacy"
              className="hover:text-brand-text"
            >
              개인정보처리방침
            </Link>

            <Link
              href="/terms"
              className="hover:text-brand-text"
            >
              이용약관
            </Link>
          </nav>

          <p className="text-xs text-muted">
            Copyright © Hwaseong Traffic
            Journal. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
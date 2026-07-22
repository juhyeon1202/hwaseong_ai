import Link from "next/link";
import type { ReactNode } from "react";

import {
  signOut,
  type CurrentUser,
} from "@/lib/auth";

type AppShellProps = {
  children: ReactNode;
  user: CurrentUser | null;
};

const navigation = [
  {
    href: "/",
    label: "홈",
    icon: "⌂",
  },
  {
    href: "/journal",
    label: "교통일지",
    icon: "▤",
  },
  {
    href: "/report",
    label: "신고",
    icon: "!",
  },
  {
    href: "/community",
    label: "게시판",
    icon: "◇",
  },
  {
    href: "/mypage",
    label: "마이",
    icon: "○",
  },
] as const;

export function AppShell({
  children,
  user,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-page">
      <AppHeader user={user} />

      <main className="mx-auto w-full max-w-[var(--app-content-width)] px-4 pb-[calc(var(--app-bottom-nav-height)+24px)] pt-5 sm:px-6 md:pb-10 md:pt-8">
        {children}
      </main>

      <MobileNavigation />
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
      <div className="mx-auto flex min-h-[var(--app-header-height)] max-w-[var(--app-content-width)] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          aria-label="화성 교통일지 홈"
          className="flex items-center gap-3"
        >
          <span className="flex size-9 items-center justify-center rounded-control bg-brand text-sm font-bold text-on-brand">
            H
          </span>

          <span>
            <strong className="block text-sm text-main">
              화성특례시
            </strong>

            <span className="block text-xs text-muted">
              교통일지
            </span>
          </span>
        </Link>

        <DesktopNavigation
          isAdmin={user?.role === "admin"}
        />

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={
                  user.role === "admin"
                    ? "/admin"
                    : "/mypage"
                }
                className="flex min-h-10 items-center rounded-control bg-brand-soft px-3 text-sm font-semibold text-brand-text"
              >
                {user.nickname}
              </Link>

              <form action={signOut}>
                <button
                  type="submit"
                  className="hidden min-h-10 items-center rounded-control px-3 text-sm font-medium text-muted hover:bg-surface-muted hover:text-main sm:flex"
                >
                  로그아웃
                </button>

                <button
                  type="submit"
                  aria-label="로그아웃"
                  title="로그아웃"
                  className="flex size-10 items-center justify-center rounded-control text-muted active:bg-surface-muted sm:hidden"
                >
                  ↪
                </button>
              </form>
            </div>
          ) : (
            <>
              <Link
                href="/auth?mode=login"
                className="hidden min-h-10 items-center px-3 text-sm font-semibold text-secondary sm:flex"
              >
                로그인
              </Link>

              <Link
                href="/auth?mode=signup"
                className="flex min-h-10 items-center rounded-control bg-brand px-4 text-sm font-semibold text-on-brand"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
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
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-control px-3 py-2 text-sm font-medium text-secondary hover:bg-surface-muted hover:text-main"
        >
          {item.label}
        </Link>
      ))}

      {isAdmin && (
        <Link
          href="/admin"
          className="rounded-control px-3 py-2 text-sm font-semibold text-brand-text hover:bg-brand-soft"
        >
          관리자
        </Link>
      )}
    </nav>
  );
}

function MobileNavigation() {
  return (
    <nav
      aria-label="모바일 주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
    >
      <div className="mx-auto grid h-[var(--app-bottom-nav-height)] max-w-lg grid-cols-5">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-11 flex-col items-center justify-center gap-1 text-muted active:bg-surface-muted"
          >
            <span
              aria-hidden="true"
              className="flex size-6 items-center justify-center text-lg font-semibold"
            >
              {item.icon}
            </span>

            <span className="text-[11px] font-medium">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
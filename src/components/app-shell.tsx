import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  DesktopNavigation,
  MobileNavigation,
} from "@/components/app-navigation";
import { PageBackButton } from "@/components/back-button";
import {
  signOut,
  type CurrentUser,
} from "@/lib/auth";

type AppShellProps = {
  children: ReactNode;
  user: CurrentUser | null;
};

export function AppShell({
  children,
  user,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <AppHeader user={user} />

      <main
        className={[
          "mx-auto w-full max-w-[var(--app-content-width)] flex-1",
          "px-4 pb-[calc(68px+24px)] pt-4",
          "sm:px-6 md:pb-10 md:pt-6",
        ].join(" ")}
      >
        {children}
      </main>

      <AppFooter />

      <MobileNavigation
        isAdmin={user?.role === "admin"}
      />
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
    <header
      className={[
        "sticky top-0 z-40",
        "border-b border-line-light",
        "bg-white/95 backdrop-blur",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto flex h-[72px]",
          "max-w-[var(--app-content-width)]",
          "items-center gap-3 px-4 sm:px-6",
        ].join(" ")}
      >
        <PageBackButton />
        
        <Link
          href="/"
          aria-label="화성 교통일지 홈"
          className="flex min-w-0 shrink-0 items-center gap-2.5"
        >
          <Image
            src="/hwaseong-logo.jpg"
            alt="화성특례시"
            width={156}
            height={44}
            priority
            className="h-9 w-auto max-w-[108px] object-contain sm:h-10 sm:max-w-[148px]"
          />

          <span className="hidden border-l border-line pl-3 lg:block">
            <strong className="block text-sm font-extrabold text-main">
              화성 교통일지
            </strong>

            <span className="mt-0.5 block text-[10px] font-medium text-muted">
              시민 참여형 교통 플랫폼
            </span>
          </span>
        </Link>

        <div className="ml-auto">
          <DesktopNavigation
            isAdmin={user?.role === "admin"}
          />
        </div>

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
          className={[
            "inline-flex min-h-11 items-center",
            "rounded-control px-3",
            "text-sm font-semibold text-secondary",
            "hover:bg-surface-muted",
          ].join(" ")}
        >
          로그인
        </Link>

        <Link
          href="/auth?mode=signup"
          className={[
            "hidden min-h-10 items-center",
            "rounded-control bg-brand px-4",
            "text-sm font-bold text-white",
            "hover:bg-brand-hover sm:inline-flex",
          ].join(" ")}
        >
          회원가입
        </Link>
      </div>
    );
  }

  const initial =
    user.nickname.trim().slice(0, 1) ||
    "사";

  return (
    <details className="group relative shrink-0">
      <summary
        className={[
          "flex min-h-11 cursor-pointer",
          "list-none items-center gap-2",
          "rounded-control px-1.5",
          "hover:bg-surface-muted",
          "[&::-webkit-details-marker]:hidden",
        ].join(" ")}
      >
        <span
          className={[
            "flex size-9 items-center justify-center",
            "rounded-full bg-info-soft",
            "text-sm font-extrabold text-info",
          ].join(" ")}
        >
          {initial}
        </span>

        <span className="hidden max-w-24 truncate text-sm font-semibold text-main xl:block">
          {user.nickname}
        </span>

        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
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

      <div
        className={[
          "absolute right-0 top-[calc(100%+8px)]",
          "z-50 w-60 overflow-hidden",
          "rounded-card border border-line",
          "bg-white p-2 shadow-floating",
        ].join(" ")}
      >
        <div className="border-b border-line-light px-3 py-3">
          <p className="truncate text-sm font-bold text-main">
            {user.nickname}
          </p>

          <p className="mt-1 truncate text-xs text-muted">
            {user.email ?? "이메일 정보 없음"}
          </p>

          <p className="mt-2 text-sm font-extrabold text-brand">
            {user.points.toLocaleString()}P
          </p>
        </div>

        <nav
          aria-label="사용자 메뉴"
          className="py-2"
        >
          <AccountLink
            href="/mypage"
            label="마이페이지"
          />

          <AccountLink
            href="/mypage/journals"
            label="내 교통일지"
          />

          <AccountLink
            href="/favorites"
            label="즐겨찾기"
          />

          <AccountLink
            href="/route-requests"
            label="희망 노선 투표"
          />

          <AccountLink
            href="/inquiries?mode=write"
            label="1:1 문의"
          />

          {user.role === "admin" && (
            <AccountLink
              href="/admin"
              label="관리자 통합 업무"
              admin
            />
          )}
        </nav>

        <form
          action={signOut}
          className="border-t border-line-light pt-2"
        >
          <button
            type="submit"
            className={[
              "flex min-h-11 w-full items-center",
              "rounded-control px-3 text-left",
              "text-sm font-semibold text-danger",
              "hover:bg-danger-soft",
            ].join(" ")}
          >
            로그아웃
          </button>
        </form>
      </div>
    </details>
  );
}

type AccountLinkProps = {
  href: string;
  label: string;
  admin?: boolean;
};

function AccountLink({
  href,
  label,
  admin = false,
}: AccountLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "flex min-h-11 items-center",
        "rounded-control px-3",
        "text-sm font-semibold",
        admin
          ? "bg-info-soft text-info"
          : "text-secondary hover:bg-surface-muted hover:text-main",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function AppFooter() {
  return (
    <footer className="hidden border-t border-line-light bg-white md:block">
      <div
        className={[
          "mx-auto grid max-w-[var(--app-content-width)]",
          "gap-8 px-6 py-9",
          "lg:grid-cols-[1.1fr_0.9fr]",
        ].join(" ")}
      >
        <div>
          <div className="flex items-center gap-4">
            <Image
              src="/hwaseong-logo.jpg"
              alt="화성특례시"
              width={156}
              height={44}
              className="h-10 w-auto object-contain"
            />

            <div className="border-l border-line pl-4">
              <strong className="block text-sm font-bold text-main">
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
        </div>

        <div className="flex flex-col gap-5 lg:items-end">
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-secondary">
            <a
              href="https://www.hscity.go.kr/www/index.do"
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand"
            >
              화성시청
            </a>

            <a
              href="https://www.instagram.com/hwaseong_city/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand"
            >
              인스타그램
            </a>

            <Link
              href="/privacy"
              className="hover:text-brand"
            >
              개인정보처리방침
            </Link>

            <Link
              href="/terms"
              className="hover:text-brand"
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
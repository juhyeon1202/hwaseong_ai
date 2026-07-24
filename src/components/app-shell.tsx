import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import {
  DesktopNavigation,
  MobileNavigation,
} from "@/components/app-navigation";
import { AiComplaintComingSoon } from "@/components/ai-complaint-coming-soon";
import { PageBackButton } from "@/components/back-button";
import { LanguageSwitcher } from "@/components/language-switcher";
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

async function AppHeader({
  user,
}: AppHeaderProps) {
  const common = await getTranslations("Common");
  const account = await getTranslations("Account");
  const accountLabels = {
    userMenu: account("userMenu"),
    mypage: account("mypage"),
    myJournal: account("myJournal"),
    favorites: account("favorites"),
    routeVote: account("routeVote"),
    inquiry: account("inquiry"),
    adminWork: account("adminWork"),
    noEmail: account("noEmail"),
    login: common("login"),
    signup: common("signup"),
    logout: common("logout"),
  };

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
          aria-label={common("serviceName")}
          className="ml-4 flex min-w-0 shrink-0 items-center gap-3 sm:ml-7"
        >
          <Image
            src="/hwaseong-logo.jpg"
            alt={common("serviceName")}
            width={156}
            height={44}
            priority
            className="h-11 w-auto max-w-[142px] object-contain sm:h-12 sm:max-w-[172px]"
          />

          <span className="hidden border-l border-line pl-3 lg:block">
            <strong className="block text-sm font-extrabold text-main">
              {common("serviceName")}
            </strong>

            <span className="mt-0.5 block text-[10px] font-medium text-muted">
              {common("serviceDescription")}
            </span>
          </span>
        </Link>

        <div className="ml-auto">
          <DesktopNavigation
            isAdmin={user?.role === "admin"}
          />
        </div>

        <LanguageSwitcher />

        <HeaderAccount user={user} labels={accountLabels} />
      </div>
    </header>
  );
}

type AccountLabels = {
  userMenu: string;
  mypage: string;
  myJournal: string;
  favorites: string;
  routeVote: string;
  inquiry: string;
  adminWork: string;
  noEmail: string;
  login: string;
  signup: string;
  logout: string;
};

function HeaderAccount({
  user,
  labels,
}: AppHeaderProps & { labels: AccountLabels }) {
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
          {labels.login}
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
          {labels.signup}
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
            @{user.username}
          </p>

          <p className="mt-2 text-sm font-extrabold text-brand">
            {user.points.toLocaleString()}P
          </p>
        </div>

        <nav
          aria-label={labels.userMenu}
          className="py-2"
        >
          <AccountLink
            href="/mypage"
            label={labels.mypage}
          />

          <AccountLink
            href="/mypage/journals"
            label={labels.myJournal}
          />

          <AccountLink
            href="/favorites"
            label={labels.favorites}
          />

          <AccountLink
            href="/route-requests"
            label={labels.routeVote}
          />

          <AccountLink
            href="/inquiries?mode=write"
            label={labels.inquiry}
          />

          <AiComplaintComingSoon />

          {user.role === "admin" && (
            <AccountLink
              href="/admin"
              label={labels.adminWork}
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
            {labels.logout}
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

async function AppFooter() {
  const common = await getTranslations("Common");
  const footer = await getTranslations("Footer");

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
              alt={common("serviceName")}
              width={156}
              height={44}
              className="h-10 w-auto object-contain"
            />

            <div className="border-l border-line pl-4">
              <strong className="block text-sm font-bold text-main">
                {common("serviceName")}
              </strong>

              <span className="mt-1 block text-xs text-muted">
                {footer("serviceDescription")}
              </span>
            </div>
          </div>

          <address className="mt-5 not-italic text-sm leading-6 text-muted">
            {footer("address")}
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
              {footer("cityHall")}
            </a>

            <a
              href="https://www.instagram.com/hwaseong_city/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand"
            >
              {footer("instagram")}
            </a>

            <Link
              href="/privacy"
              className="hover:text-brand"
            >
              {footer("privacy")}
            </Link>

            <Link
              href="/terms"
              className="hover:text-brand"
            >
              {footer("terms")}
            </Link>
          </nav>

          <p className="text-xs text-muted">
            {footer("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}

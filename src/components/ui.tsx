import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

type Variant =
  | "primary"
  | "secondary"
  | "danger"
  | "kakao";

const buttonVariants: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand hover:bg-brand-hover",

  secondary:
    "border border-line bg-surface text-secondary hover:bg-surface-muted",

  danger:
    "bg-danger text-white hover:opacity-90",

  kakao:
    "bg-kakao text-kakao-text hover:brightness-95",
};

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    fullWidth?: boolean;
  };

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex min-h-11 items-center justify-center",
        "rounded-control px-4 text-sm font-semibold",
        "transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  fullWidth?: boolean;
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex min-h-11 items-center justify-center",
        "rounded-control px-4 text-sm font-semibold",
        "transition-colors",
        buttonVariants[variant],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padded?: boolean;
};

export function Card({
  children,
  padded = true,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-card border border-line",
        "bg-surface shadow-card",
        padded ? "p-5" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

type BadgeVariant =
  | "brand"
  | "danger"
  | "warning"
  | "success"
  | "info";

const badgeVariants: Record<
  BadgeVariant,
  string
> = {
  brand:
    "bg-brand-soft text-brand-text",

  danger:
    "bg-danger-soft text-danger",

  warning:
    "bg-warning-soft text-warning",

  success:
    "bg-success-soft text-success",

  info:
    "bg-info-soft text-info",
};

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
};

export function Badge({
  children,
  variant = "brand",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex min-h-7 items-center",
        "rounded-pill px-3",
        "text-xs font-semibold",
        badgeVariants[variant],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({
  title,
  description,
  action,
}: SectionHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-main">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm text-muted">
            {description}
          </p>
        )}
      </div>

      {action}
    </header>
  );
}

type ProgressBarProps = {
  value: number;
  variant?: "brand" | "danger" | "success";
};

export function ProgressBar({
  value,
  variant = "brand",
}: ProgressBarProps) {
  const safeValue = Math.min(
    100,
    Math.max(0, value),
  );

  const colors = {
    brand: "bg-brand",
    danger: "bg-danger",
    success: "bg-success",
  };

  return (
    <div
      className="h-2 overflow-hidden rounded-pill bg-line-light"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
    >
      <div
        className={`h-full rounded-pill ${colors[variant]}`}
        style={{
          width: `${safeValue}%`,
        }}
      />
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface p-8 text-center">
      <h3 className="font-bold text-main">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted">
        {description}
      </p>

      {action && (
        <div className="mt-5 flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink border border-transparent hover:brightness-110 active:brightness-95 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]",
  secondary:
    "bg-panel-soft text-ink border border-line-strong hover:bg-raised hover:border-line-strong",
  ghost: "bg-transparent text-ink-muted border border-transparent hover:bg-panel-soft hover:text-ink",
  danger:
    "bg-danger-soft text-danger border border-danger/25 hover:bg-danger/15 hover:border-danger/40",
  subtle: "bg-accent-soft text-accent border border-accent/20 hover:border-accent/40",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9.5 px-4 text-[13.5px] gap-2 rounded-lg",
  lg: "h-11 px-5 text-sm gap-2 rounded-xl",
  icon: "h-9 w-9 justify-center rounded-lg",
};

export function buttonClasses(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors focus-ring disabled:opacity-50 disabled:pointer-events-none select-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant = "secondary", size = "md", className, type, ...props }: ButtonProps) {
  return (
    <button type={type ?? "button"} className={buttonClasses(variant, size, className)} {...props} />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

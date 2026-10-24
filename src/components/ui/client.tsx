"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, Loader2, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending || props.disabled} {...props}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      {pending ? pendingLabel ?? children : children}
    </Button>
  );
}

export function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      aria-live="polite"
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? copiedLabel : label}
    </Button>
  );
}

export function DismissibleNotice({
  tone = "warn",
  title,
  children,
  className,
}: {
  tone?: "info" | "warn" | "danger" | "ok";
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const tones = {
    info: "border-accent/25 bg-accent-soft",
    warn: "border-warn/30 bg-warn-soft",
    danger: "border-danger/30 bg-danger-soft",
    ok: "border-ok/30 bg-ok-soft",
  };
  return (
    <div className={cn("relative flex items-start gap-3 rounded-xl border px-4 py-3 pe-10 text-xs leading-5", tones[tone], className)}>
      <div className="min-w-0 space-y-0.5">
        <p className="text-[12.5px] font-semibold text-ink">{title}</p>
        {children ? <div className="text-ink-muted">{children}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="absolute end-2 top-2 rounded-md p-1.5 text-ink-faint hover:bg-panel-soft hover:text-ink focus-ring"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

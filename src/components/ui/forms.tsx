import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[12px] font-medium text-ink-muted">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] leading-4 text-ink-faint">{hint}</p> : null}
      {error ? <p className="text-[11px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}

export const inputClasses =
  "w-full rounded-lg border border-line-strong bg-canvas/60 px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint/80 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClasses, "h-9.5", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClasses, "min-h-20 resize-y leading-6", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(inputClasses, "h-9.5 cursor-pointer appearance-none pe-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg py-1.5", className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-line-strong bg-canvas accent-[var(--accent)] focus-ring"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-[11px] leading-4 text-ink-faint">{description}</span> : null}
      </span>
    </label>
  );
}

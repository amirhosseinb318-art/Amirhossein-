"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[radar] page error", error.message);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-danger/30 bg-danger-soft text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 text-[13px] leading-6 text-ink-muted">
        The page could not be rendered. The error was logged server-side without
        exposing sensitive details.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-lg border border-line-strong bg-panel-soft px-4 py-2 text-[13px] font-medium text-ink hover:bg-raised focus-ring"
      >
        Try again
      </button>
    </div>
  );
}

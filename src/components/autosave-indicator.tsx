"use client";

import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

export function AutosaveIndicator() {
  const { isSaving, lastSaved } = useStore();

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      {isSaving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      ) : lastSaved ? (
        <>
          <Check className="h-3 w-3 text-black dark:text-white" />
          <span>Saved</span>
        </>
      ) : null}
    </div>
  );
}

export function AutosaveIndicatorBadge() {
  const { isSaving, lastSaved } = useStore();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all",
        isSaving
          ? "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
          : lastSaved
          ? "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white"
          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
      )}
    >
      {isSaving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      ) : lastSaved ? (
        <>
          <Check className="h-3 w-3" />
          <span>Saved</span>
        </>
      ) : (
        <span>Ready</span>
      )}
    </div>
  );
}

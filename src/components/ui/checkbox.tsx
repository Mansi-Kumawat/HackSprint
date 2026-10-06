"use client";

import { cn } from "@/lib/utils";

/** Animated completion checkbox with a drawn checkmark. */
export function CompletionCheckbox({
  checked,
  onToggle,
  className,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? (checked ? "Mark as incomplete" : "Mark as complete")}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "check-draw-group mt-0.5 flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-[1.5px] transition-all duration-200",
        checked
          ? "check-on scale-105 border-accent bg-accent shadow-[0_0_0_3px_var(--accent-soft)]"
          : "border-border-strong bg-card hover:border-accent hover:bg-accent-soft",
        className,
      )}
    >
      <svg viewBox="0 0 14 14" className="size-3" fill="none">
        <path
          d="M2.5 7.5l3 3 6-7"
          stroke="var(--accent-foreground)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="check-path"
        />
      </svg>
    </button>
  );
}

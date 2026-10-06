import type { PhaseStatus } from "@/lib/compute";
import { cn } from "@/lib/utils";

export const PHASE_STATUS_META: Record<
  PhaseStatus,
  { label: string; chip: string; ring: string }
> = {
  "not-started": {
    label: "Not Started",
    chip: "bg-muted text-muted-foreground",
    ring: "border-border-strong bg-card text-muted-foreground",
  },
  "in-progress": {
    label: "In Progress",
    chip: "bg-accent-soft text-accent",
    ring: "border-accent bg-accent-soft text-accent",
  },
  completed: {
    label: "Completed",
    chip: "bg-success/10 text-success",
    ring: "border-success bg-success/10 text-success",
  },
  "at-risk": {
    label: "At Risk",
    chip: "bg-danger/10 text-danger",
    ring: "border-danger bg-danger/10 text-danger",
  },
};

export function PhaseStatusBadge({ status, className }: { status: PhaseStatus; className?: string }) {
  const meta = PHASE_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        meta.chip,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

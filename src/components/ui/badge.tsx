import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-[-0.01em]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-muted text-muted-foreground",
        outline: "border-border text-muted-foreground",
        accent: "border-transparent bg-accent-soft text-accent",
        critical: "border-transparent bg-danger/10 text-danger",
        high: "border-transparent bg-warning/10 text-warning",
        medium: "border-transparent bg-sky-500/10 text-sky-600 dark:text-sky-400",
        low: "border-transparent bg-muted text-muted-foreground",
        success: "border-transparent bg-success/10 text-success",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

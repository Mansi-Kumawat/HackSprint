import { cn } from "@/lib/utils";

const AVATAR_STYLES: Record<string, string> = {
  v1: "bg-indigo-500/12 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300",
  v2: "bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
  v3: "bg-amber-500/14 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
};

export function Avatar({
  name,
  variant = "v1",
  size = "md",
  className,
}: {
  name: string;
  variant?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        AVATAR_STYLES[variant] ?? AVATAR_STYLES.v1,
        size === "sm" && "size-5 text-[10px]",
        size === "md" && "size-7 text-xs",
        size === "lg" && "size-9 text-sm",
        className,
      )}
    >
      {initial}
    </span>
  );
}

/** Small "Everyone" pseudo-avatar. */
export function EveryoneAvatar({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <span
      title="Everyone"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground",
        size === "sm" ? "size-5 text-[9px]" : "size-7 text-[10px]",
        className,
      )}
    >
      ALL
    </span>
  );
}

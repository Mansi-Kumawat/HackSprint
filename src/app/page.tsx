"use client";

import { LAST_WORKSPACE_KEY } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Boot screen: resumes the last workspace, or creates and seeds a new one. */
export default function RootPage() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    const boot = async () => {
      try {
        const last = localStorage.getItem(LAST_WORKSPACE_KEY);
        if (last) {
          const res = await fetch(`/api/w/${last}`, { cache: "no-store" });
          if (res.ok) {
            if (!cancelled) router.replace(`/w/${last}`);
            return;
          }
          localStorage.removeItem(LAST_WORKSPACE_KEY);
        }
        const res = await fetch("/api/workspaces", { method: "POST" });
        if (!res.ok) throw new Error("create failed");
        const { id } = (await res.json()) as { id: string };
        localStorage.setItem(LAST_WORKSPACE_KEY, id);
        if (!cancelled) router.replace(`/w/${id}`);
      } catch {
        if (!cancelled) setError(true);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="flex flex-col items-center text-center">
        <span className="relative flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-[0_8px_30px_-6px_var(--accent)]">
          <Zap className="size-6" />
          <span className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-accent/20" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">HackSprint</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          From idea to submission — one task at a time.
        </p>
        {error ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-danger">Something went wrong while opening your workspace.</p>
            <Button onClick={() => window.location.reload()}>Try again</Button>
          </div>
        ) : (
          <div className="mt-7 flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="size-3.5 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
            Preparing your workspace…
          </div>
        )}
      </div>
    </main>
  );
}

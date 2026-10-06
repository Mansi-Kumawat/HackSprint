"use client";

import { useWorkspace } from "@/components/providers/workspace-provider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { fmtShort, todayStr } from "@/lib/compute";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Search, SearchX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function useTaskSearch(query: string): Task[] {
  const { tasks, phases, members } = useWorkspace();
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const phaseName = (id: string) => phases.find((p) => p.id === id)?.name.toLowerCase() ?? "";
    const memberName = (id: string) =>
      id === "everyone" ? "everyone" : (members.find((m) => m.id === id)?.name.toLowerCase() ?? "");
    return tasks
      .filter((t) => {
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          phaseName(t.phaseId).includes(q) ||
          `phase ${phases.find((p) => p.id === t.phaseId)?.phaseNumber}`.includes(q) ||
          memberName(t.assignedTo).includes(q)
        );
      })
      .slice(0, 30);
  }, [query, tasks, phases, members]);
}

export function SearchPalette({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (taskId: string) => void;
}) {
  const { phases } = useWorkspace();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useTaskSearch(query);
  const today = todayStr();

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="top-[12vh] max-w-xl -translate-y-0 p-0 sm:top-[16vh]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Search tasks</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, description, tag, phase, or member…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) onPick(results[0].id);
            }}
          />
          <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[46vh] overflow-y-auto p-1.5">
          {query.trim() === "" ? (
            <div className="px-3 py-8 text-center text-[13px] text-muted-foreground">
              Type to search across all tasks.
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <SearchX className="size-5 text-muted-foreground/60" />
              <div className="text-[13px] text-muted-foreground">No tasks match your search.</div>
            </div>
          ) : (
            results.map((t) => {
              const ph = phases.find((p) => p.id === t.phaseId);
              const overdue = !t.completed && t.dueDate && t.dueDate < today;
              return (
                <button
                  key={t.id}
                  onClick={() => onPick(t.id)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted",
                    t.completed && "opacity-55",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      t.priority === "critical"
                        ? "bg-danger"
                        : t.priority === "high"
                          ? "bg-warning"
                          : t.priority === "medium"
                            ? "bg-sky-500"
                            : "bg-muted-foreground/40",
                    )}
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[13.5px]",
                      t.completed && "line-through",
                    )}
                  >
                    {t.title}
                  </span>
                  {ph && (
                    <Badge variant="outline" className="shrink-0">
                      P{ph.phaseNumber}
                    </Badge>
                  )}
                  {t.dueDate && (
                    <span
                      className={cn(
                        "shrink-0 text-[11px] tabular-nums",
                        overdue ? "font-medium text-danger" : "text-muted-foreground",
                      )}
                    >
                      {fmtShort(t.dueDate)}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

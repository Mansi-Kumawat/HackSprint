"use client";

import { useUI } from "@/components/app-shell";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { fmtFull, todayStr } from "@/lib/compute";
import type { Phase, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, Flag, Plus } from "lucide-react";
import { useMemo, useState } from "react";

const PRIORITY_CHIP: Record<Task["priority"], string> = {
  critical: "bg-danger/10 text-danger hover:bg-danger/20",
  high: "bg-warning/10 text-warning hover:bg-warning/20",
  medium: "bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-400",
  low: "bg-muted text-muted-foreground hover:bg-muted/70",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const { tasks, phases, workspace } = useWorkspace();
  const { openEditTask, openCreateTask } = useUI();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const today = todayStr();

  const byDate = useMemo(() => {
    const map = new Map<string, { tasks: Task[]; phaseEnds: Phase[]; deadline: boolean }>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const entry = map.get(t.dueDate) ?? { tasks: [], phaseEnds: [], deadline: false };
      entry.tasks.push(t);
      map.set(t.dueDate, entry);
    }
    for (const p of phases) {
      const entry = map.get(p.endDate) ?? { tasks: [], phaseEnds: [], deadline: false };
      entry.phaseEnds.push(p);
      map.set(p.endDate, entry);
    }
    const dl = map.get(workspace.deadline) ?? { tasks: [], phaseEnds: [], deadline: false };
    dl.deadline = true;
    map.set(workspace.deadline, dl);
    return map;
  }, [tasks, phases, workspace.deadline]);

  /* month grid (weeks start Monday) */
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    let cursor = start;
    while (cursor <= end) {
      out.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return out;
  }, [month]);

  return (
    <div className="mx-auto max-w-6xl animate-slide-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Calendar</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Deadlines, phase ends, and the big day.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8" onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="iconSm" className="h-8 w-8" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <span className="min-w-32 text-center text-sm font-semibold tabular-nums">
            {format(month, "MMMM yyyy")}
          </span>
          <Button variant="outline" size="iconSm" className="h-8 w-8" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
            <ChevronRight />
          </Button>
          <Button size="sm" className="ml-1 h-8" onClick={() => openCreateTask()}>
            <Plus /> Task
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        {/* weekday header */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-1.5 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>

        {/* grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const entry = byDate.get(key);
            const isToday = key === today;
            const inMonth = isSameMonth(day, month);
            const dayTasks = entry?.tasks ?? [];
            const ordered = [...dayTasks].sort((a, b) => Number(a.completed) - Number(b.completed));
            const visible = ordered.slice(0, 3);
            const overflow = ordered.length - visible.length;

            return (
              <div
                key={key}
                className={cn(
                  "min-h-20 border-b border-r border-border p-1 sm:min-h-28 sm:p-1.5",
                  i % 7 === 6 && "border-r-0",
                  !inMonth && "bg-muted/25",
                  isToday && "bg-accent-soft/50",
                )}
              >
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className={cn(
                      "flex size-5.5 items-center justify-center rounded-full text-[11px] tabular-nums sm:size-6 sm:text-xs",
                      isToday
                        ? "bg-accent font-bold text-accent-foreground"
                        : inMonth
                          ? "text-foreground/80"
                          : "text-muted-foreground/50",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {entry?.deadline && (
                    <span className="hidden items-center gap-1 rounded bg-danger/10 px-1 py-px text-[8.5px] font-bold uppercase text-danger sm:inline-flex">
                      <Flag className="size-2.5" /> Submit
                    </span>
                  )}
                </div>

                <div className="mt-1 space-y-0.5">
                  {entry?.phaseEnds.map((p) => (
                    <div
                      key={p.id}
                      className="hidden items-center gap-1 truncate rounded border border-accent/30 bg-accent-soft px-1 py-px text-[9.5px] font-semibold text-accent sm:flex"
                      title={`Phase ${p.phaseNumber} ends — ${p.name}`}
                    >
                      <span className="size-1 rotate-45 bg-accent" />
                      P{p.phaseNumber} ends
                    </div>
                  ))}
                  {visible.map((t) => {
                    const overdue = !t.completed && key < today;
                    return (
                      <button
                        key={t.id}
                        onClick={() => openEditTask(t.id)}
                        title={`${t.title}${t.dueDate ? ` · ${fmtFull(t.dueDate)}` : ""}`}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-1 truncate rounded px-1 py-px text-left text-[9.5px] font-medium transition-colors sm:text-[10.5px]",
                          PRIORITY_CHIP[t.priority],
                          t.completed && "opacity-50 line-through",
                          overdue && "ring-1 ring-danger/40",
                        )}
                      >
                        {overdue && <span className="size-1 shrink-0 rounded-full bg-danger" />}
                        <span className="truncate">{t.title}</span>
                      </button>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="px-1 text-[9px] font-medium text-muted-foreground">+{overflow} more</div>
                  )}
                  {/* compact dots on very small screens */}
                  <div className="flex flex-wrap gap-0.5 px-0.5 sm:hidden">
                    {ordered.length > 3 && <span className="text-[8px] text-muted-foreground">…</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide">Legend</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-danger" /> Critical</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" /> High</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-500" /> Medium</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground/40" /> Low</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rotate-45 bg-accent" /> Phase end</span>
        <span className="inline-flex items-center gap-1.5"><Flag className="size-3 text-danger" /> Hackathon deadline</span>
      </div>
    </div>
  );
}

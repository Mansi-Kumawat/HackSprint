"use client";

import { useUI } from "@/components/app-shell";
import { PhaseStatusBadge } from "@/components/phase-status";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { TaskRow } from "@/components/task-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  computePhaseStatus,
  fmtShort,
  getCurrentPhase,
  phaseProgress,
  smartSort,
  todayStr,
} from "@/lib/compute";
import { cn } from "@/lib/utils";
import { BadgeCheck, CalendarDays, Check, ChevronDown, Plus, Rocket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function PhasesPage() {
  const { tasks, phases } = useWorkspace();
  const { openCreateTask } = useUI();
  const today = todayStr();
  const currentPhase = useMemo(() => getCurrentPhase(phases, tasks, today), [phases, tasks, today]);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set([currentPhase.id]));

  /* deep-link: #phase-N */
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/#phase-(\d+)/);
    if (!match) return;
    const target = phases.find((p) => p.phaseNumber === Number(match[1]));
    if (!target) return;
    setOpenIds((prev) => new Set(prev).add(target.id));
    requestAnimationFrame(() => {
      document.getElementById(`phase-${target.phaseNumber}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [phases]);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-4xl animate-slide-up">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Phases</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            The 16-phase journey from idea to submission.
          </p>
        </div>
        <Button onClick={() => openCreateTask(currentPhase.id)}>
          <Plus /> Add Task
        </Button>
      </div>

      <div className="relative">
        {/* timeline rail */}
        <div className="absolute bottom-4 left-[19px] top-4 hidden w-px bg-border sm:block" />

        <div className="space-y-3">
          {phases.map((phase, i) => {
            const pTasks = tasks.filter((t) => t.phaseId === phase.id);
            const done = pTasks.filter((t) => t.completed).length;
            const pct = phaseProgress(pTasks);
            const status = computePhaseStatus(phase, pTasks, today);
            const open = openIds.has(phase.id);
            const isCurrent = phase.id === currentPhase.id;
            const mvpReady = phase.phaseNumber === 8 && status === "completed";
            const submitted = phase.phaseNumber === 15 && status === "completed";

            return (
              <div key={phase.id} id={`phase-${phase.phaseNumber}`} className="relative scroll-mt-20 sm:pl-12">
                {/* node */}
                <span
                  className={cn(
                    "absolute left-2 top-5 hidden size-6 items-center justify-center rounded-full border-[1.5px] text-[10px] font-bold sm:flex",
                    status === "completed"
                      ? "border-success bg-success text-white"
                      : status === "at-risk"
                        ? "border-danger bg-danger/10 text-danger"
                        : status === "in-progress"
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border-strong bg-card text-muted-foreground",
                  )}
                >
                  {status === "completed" ? <Check className="size-3" strokeWidth={3} /> : phase.phaseNumber}
                </span>

                <div
                  className={cn(
                    "animate-slide-up overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] transition-colors",
                    isCurrent ? "border-accent/40" : "border-border",
                  )}
                  style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}
                >
                  {/* header (always visible) */}
                  <button
                    onClick={() => toggle(phase.id)}
                    className="flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left sm:items-center sm:px-5"
                    aria-expanded={open}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold tracking-[-0.01em]">
                          Phase {phase.phaseNumber} · {phase.name}
                        </span>
                        {isCurrent && status !== "completed" && (
                          <span className="rounded bg-accent px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-accent-foreground">
                            Current
                          </span>
                        )}
                        {mvpReady && (
                          <Badge variant="success" className="font-semibold">
                            <BadgeCheck className="size-3" /> MVP READY
                          </Badge>
                        )}
                        {submitted && (
                          <Badge variant="success" className="font-semibold">
                            <Rocket className="size-3" /> SUBMITTED
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{phase.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {fmtShort(phase.startDate)} → {fmtShort(phase.endDate)}
                        </span>
                        <span>
                          {done}/{pTasks.length} tasks
                        </span>
                        <span className={cn("font-semibold", pct === 100 ? "text-success" : "text-foreground/80")}>
                          {pct}%
                        </span>
                      </div>
                      <Progress value={pct} className="mt-2 h-1" />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden sm:inline">
                        <PhaseStatusBadge status={status} />
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground transition-transform duration-300",
                          open && "rotate-180",
                        )}
                      />
                    </div>
                  </button>

                  {/* collapsible task list */}
                  <div className={cn("collapse-grid", open && "open")}>
                    <div className="collapse-inner">
                      <div className="border-t border-border px-2 py-2 sm:px-3">
                        <span className="mb-1 mt-1 block px-2.5 sm:hidden">
                          <PhaseStatusBadge status={status} />
                        </span>
                        {smartSort(pTasks, today).map((t) => (
                          <TaskRow key={t.id} task={t} showPhase={false} />
                        ))}
                        <div className="px-2.5 pb-1.5 pt-1">
                          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={() => openCreateTask(phase.id)}>
                            <Plus /> Add task to Phase {phase.phaseNumber}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

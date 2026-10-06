"use client";

import { useUI } from "@/components/app-shell";
import { PhaseStatusBadge, PHASE_STATUS_META } from "@/components/phase-status";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { TaskRow } from "@/components/task-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress, ProgressRing } from "@/components/ui/progress";
import {
  computeCountdown,
  computePhaseStatus,
  computeStats,
  computeStreak,
  fmtFull,
  fmtShort,
  getCurrentPhase,
  phaseProgress,
  todaysFocus,
  todayStr,
  upcomingTasks,
} from "@/lib/compute";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  Flag,
  Flame,
  PartyPopper,
  Plus,
  Rocket,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function useCountUp(target: number, duration = 900): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

const CARD = "rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5";

export default function DashboardPage() {
  const { workspace, tasks, phases, activity } = useWorkspace();
  const { openCreateTask } = useUI();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const today = todayStr();
  const stats = useMemo(() => computeStats(tasks, today), [tasks, today]);
  const countdown = useMemo(() => computeCountdown(workspace.deadline), [workspace.deadline]);
  const streak = useMemo(() => computeStreak(activity), [activity]);
  const focus = useMemo(() => todaysFocus(tasks, today, 8), [tasks, today]);
  const upcoming = useMemo(() => upcomingTasks(tasks, today, 5), [tasks, today]);
  const currentPhase = useMemo(() => getCurrentPhase(phases, tasks, today), [phases, tasks, today]);
  const completedToday = useMemo(
    () =>
      activity.filter(
        (a) => a.action === "completed" && a.createdAt.slice(0, 10) === today,
      ).length,
    [activity, today],
  );

  const progressAnim = useCountUp(stats.progress);
  const countdownAnim = useCountUp(countdown.value, 1100);

  const currentPhaseTasks = tasks.filter((t) => t.phaseId === currentPhase.id);
  const currentStatus = computePhaseStatus(currentPhase, currentPhaseTasks, today);
  const currentPct = phaseProgress(currentPhaseTasks);

  const dismiss = (key: string) => setDismissed((d) => [...d, key]);

  const alerts: { key: string; tone: "danger" | "warning" | "accent"; icon: typeof AlertTriangle; text: string }[] = [];
  if (stats.overdue > 0)
    alerts.push({
      key: "overdue",
      tone: "danger",
      icon: AlertTriangle,
      text: `${stats.overdue} task${stats.overdue > 1 ? "s are" : " is"} overdue.`,
    });
  if (stats.dueToday > 0)
    alerts.push({
      key: "today",
      tone: "warning",
      icon: CalendarClock,
      text: `${stats.dueToday} task${stats.dueToday > 1 ? "s are" : " is"} due today.`,
    });
  if (stats.critical > 0)
    alerts.push({
      key: "critical",
      tone: "danger",
      icon: Flag,
      text: `${stats.critical} critical task${stats.critical > 1 ? "s" : ""} still open.`,
    });
  if (countdown.kind === "days" && countdown.value <= 7)
    alerts.push({
      key: "deadline",
      tone: "accent",
      icon: Clock,
      text: `The deadline is approaching — ${countdown.value} day${countdown.value > 1 ? "s" : ""} left. Prioritize submission-critical work.`,
    });

  /* countdown display */
  const cd = {
    days: { value: String(countdownAnim), unit: countdown.value === 1 ? "day to go" : "days to go" },
    hours: { value: String(countdownAnim), unit: "hours to go" },
    "submission-day": { value: "Submission", unit: "day" },
    completed: { value: "Sprint", unit: "complete" },
  }[countdown.kind];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* ---------------------------------------------------------- header */}
      <section className="animate-slide-up">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
                {workspace.hackathonName}
              </span>
            </div>
            <h1 className="mt-2.5 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
              {countdown.kind === "completed" ? (
                <span className="inline-flex items-center gap-2.5">
                  <PartyPopper className="size-7 text-accent" /> Hackathon Completed
                </span>
              ) : countdown.kind === "submission-day" ? (
                <span className="inline-flex items-center gap-2.5">
                  <Rocket className="size-7 text-accent" /> Submission Day
                </span>
              ) : (
                <>
                  <span className="tabular-nums">{cd.value}</span>{" "}
                  <span className="text-muted-foreground">Days to Go</span>
                </>
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              From idea to submission — one task at a time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 tabular-nums">
              <CalendarDays className="size-3.5" /> {fmtFull(today)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 tabular-nums">
              <Target className="size-3.5 text-danger" /> Deadline · Oct 30, 2026
            </span>
          </div>
        </div>

        {/* big progress */}
        <div className={cn(CARD, "mt-5")}>
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-semibold tabular-nums tracking-[-0.02em]">
                {progressAnim}%
              </span>
              <span className="text-sm text-muted-foreground">overall progress</span>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {stats.completed} of {stats.total} tasks · {stats.remaining} remaining
            </span>
          </div>
          <Progress value={stats.progress} className="h-2.5" />
        </div>
      </section>

      {/* -------------------------------------------------------- stat row */}
      <section className="grid animate-slide-up grid-cols-2 gap-3 lg:grid-cols-4" style={{ animationDelay: "60ms" }}>
        <div className={cn(CARD, "flex items-center gap-4")}>
          <div className="relative shrink-0">
            <ProgressRing value={stats.progress} size={72} stroke={7} />
            <span className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">
              {stats.progress}%
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">Overall Progress</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">
              {stats.completed}
              <span className="text-muted-foreground">/{stats.total} done</span>
            </div>
          </div>
        </div>

        <div className={cn(CARD, "flex items-center gap-4")}>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <CalendarClock className="size-5" />
          </span>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Today&apos;s Tasks</div>
            <div className="mt-0.5 text-xl font-semibold tabular-nums">{stats.dueToday}</div>
            <div className="text-[11px] text-muted-foreground">{completedToday} completed today</div>
          </div>
        </div>

        <div className={cn(CARD, "flex items-center gap-4")}>
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              stats.overdue > 0 ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground",
            )}
          >
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Overdue</div>
            <div
              className={cn(
                "mt-0.5 text-xl font-semibold tabular-nums",
                stats.overdue > 0 && "text-danger",
              )}
            >
              {stats.overdue}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats.overdue > 0 ? "needs attention" : "all on track"}
            </div>
          </div>
        </div>

        <div className={cn(CARD, "flex items-center gap-4")}>
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              streak > 0 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground",
            )}
          >
            <Flame className={cn("size-5", streak > 0 && "flame-sway")} />
          </span>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Streak</div>
            <div className="mt-0.5 text-xl font-semibold tabular-nums">
              {streak} <span className="text-sm font-normal text-muted-foreground">day{streak === 1 ? "" : "s"}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">consecutive completions</div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- alerts */}
      {alerts.filter((a) => !dismissed.includes(a.key)).length > 0 && (
        <section className="animate-slide-up space-y-2" style={{ animationDelay: "90ms" }}>
          {alerts
            .filter((a) => !dismissed.includes(a.key))
            .map((a) => (
              <div
                key={a.key}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px]",
                  a.tone === "danger" && "border-danger/25 bg-danger/[0.06] text-danger",
                  a.tone === "warning" && "border-warning/30 bg-warning/[0.07] text-warning",
                  a.tone === "accent" && "border-accent/25 bg-accent-soft text-accent",
                )}
              >
                <a.icon className="size-4 shrink-0" />
                <span className="font-medium">{a.text}</span>
                <button
                  aria-label="Dismiss"
                  onClick={() => dismiss(a.key)}
                  className="ml-auto cursor-pointer rounded p-1 opacity-60 transition-opacity hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
        </section>
      )}

      {/* ------------------------------------------ focus + current phase */}
      <section className="grid animate-slide-up gap-4 lg:grid-cols-5" style={{ animationDelay: "120ms" }}>
        {/* Today's focus */}
        <div className={cn(CARD, "lg:col-span-3")}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Today&apos;s Focus</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Overdue, due today, and high-priority work.
              </p>
            </div>
            <Button size="sm" onClick={() => openCreateTask(currentPhase.id)}>
              <Plus /> Add Task
            </Button>
          </div>
          {focus.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <BadgeCheck className="size-6 text-success/70" />
              <p className="text-sm font-medium">Nothing urgent right now.</p>
              <p className="max-w-60 text-xs text-muted-foreground">
                Pick up the next task from the roadmap and keep the momentum going.
              </p>
            </div>
          ) : (
            <div className="-mx-2.5">
              {focus.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </div>

        {/* Current phase + upcoming */}
        <div className="space-y-4 lg:col-span-2">
          <div className={cn(CARD)}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Current Phase
              </span>
              <div className="flex items-center gap-1.5">
                {currentPhase.phaseNumber === 8 && currentStatus === "completed" && (
                  <Badge variant="success" className="font-semibold">
                    <BadgeCheck className="size-3" /> MVP READY
                  </Badge>
                )}
                {currentPhase.phaseNumber === 15 && currentStatus === "completed" && (
                  <Badge variant="success" className="font-semibold">
                    <Rocket className="size-3" /> SUBMITTED
                  </Badge>
                )}
                <PhaseStatusBadge status={currentStatus} />
              </div>
            </div>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em]">
              Phase {currentPhase.phaseNumber} — {currentPhase.name}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {currentPhase.description}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs tabular-nums text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {fmtShort(currentPhase.startDate)} → {fmtShort(currentPhase.endDate)}
              </span>
              <span>
                {currentPhaseTasks.filter((t) => t.completed).length}/{currentPhaseTasks.length} tasks ·{" "}
                {currentPct}%
              </span>
            </div>
            <Progress value={currentPct} className="mt-2" />
            <Link
              href={`/w/${workspace.id}/phases`}
              className="mt-3.5 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              View all phases <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className={cn(CARD)}>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Up Next</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">The next 5 important tasks.</p>
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No upcoming tasks scheduled.
              </p>
            ) : (
              <div className="-mx-2.5 mt-1">
                {upcoming.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- roadmap */}
      <section className={cn(CARD, "animate-slide-up overflow-hidden")} style={{ animationDelay: "150ms" }}>
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Hackathon Roadmap</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Phase 0 → 15 · Oct 3 → Oct 30, 2026</p>
          </div>
          <Link href={`/w/${workspace.id}/phases`} className="text-xs font-medium text-accent hover:underline">
            Details
          </Link>
        </div>
        <div className="-mx-2 mt-4 flex snap-x gap-2 overflow-x-auto px-2 pb-1">
          {phases.map((p) => {
            const pTasks = tasks.filter((t) => t.phaseId === p.id);
            const pct = phaseProgress(pTasks);
            const status = computePhaseStatus(p, pTasks, today);
            const meta = PHASE_STATUS_META[status];
            const special =
              (p.phaseNumber === 8 && status === "completed") ||
              (p.phaseNumber === 15 && status === "completed");
            return (
              <Link
                key={p.id}
                href={`/w/${workspace.id}/phases#phase-${p.phaseNumber}`}
                className={cn(
                  "w-36 shrink-0 snap-start rounded-xl border border-border p-3 transition-all hover:border-border-strong hover:shadow-[var(--shadow-soft)]",
                  p.id === currentPhase.id && "border-accent/40 bg-accent-soft/40",
                )}
                title={`${p.name} — ${meta.label}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border-[1.5px] text-[10px] font-bold",
                      meta.ring,
                      status === "in-progress" && "pulse-dot",
                    )}
                  >
                    {status === "completed" ? <Check className="size-3" /> : p.phaseNumber}
                  </span>
                  {special && (
                    <span className="rounded bg-success/10 px-1 py-px text-[8.5px] font-bold text-success">
                      {p.phaseNumber === 8 ? "MVP" : "SUBMIT"}
                    </span>
                  )}
                </div>
                <div className="mt-2 line-clamp-2 min-h-8 text-xs font-medium leading-snug">
                  {p.name}
                </div>
                <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                  {fmtShort(p.startDate)} – {fmtShort(p.endDate)}
                </div>
                <Progress value={pct} className="mt-2 h-1" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

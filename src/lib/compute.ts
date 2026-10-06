import {
  addDays,
  differenceInCalendarDays,
  differenceInHours,
  endOfDay,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns";
import type { ActivityItem, Member, Phase, Task } from "./types";

/* ------------------------------------------------------------------ dates */

export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function fmtShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "No date";
  return format(parseISO(dateStr), "MMM d");
}

export function fmtFull(dateStr: string | null | undefined): string {
  if (!dateStr) return "No date";
  return format(parseISO(dateStr), "EEE, MMM d, yyyy");
}

export const isOverdue = (t: Task, today: string) =>
  !t.completed && !!t.dueDate && t.dueDate < today;

export const isDueToday = (t: Task, today: string) =>
  !t.completed && t.dueDate === today;

/** Due within the next 3 days (incl. today), not completed, not overdue. */
export const isDueSoon = (t: Task, today: string) => {
  if (t.completed || !t.dueDate || t.dueDate <= today) return false;
  return differenceInCalendarDays(parseISO(t.dueDate), parseISO(today)) <= 3;
};

/* ----------------------------------------------------------------- stats */

export interface Stats {
  total: number;
  completed: number;
  remaining: number;
  overdue: number;
  dueToday: number;
  critical: number;
  progress: number; // 0-100
}

export function computeStats(tasks: Task[], today: string): Stats {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const overdue = tasks.filter((t) => isOverdue(t, today)).length;
  const dueToday = tasks.filter((t) => isDueToday(t, today)).length;
  const critical = tasks.filter((t) => !t.completed && t.priority === "critical").length;
  return {
    total,
    completed,
    remaining: total - completed,
    overdue,
    dueToday,
    critical,
    progress: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

/* ---------------------------------------------------------------- phases */

export type PhaseStatus = "not-started" | "in-progress" | "completed" | "at-risk";

export function computePhaseStatus(phase: Phase, pTasks: Task[], today: string): PhaseStatus {
  const total = pTasks.length;
  const done = pTasks.filter((t) => t.completed).length;
  if (total > 0 && done === total) return "completed";

  const hasOverdue = pTasks.some((t) => isOverdue(t, today));
  const daysToEnd = differenceInCalendarDays(parseISO(phase.endDate), parseISO(today));
  // End date near (≤2 days) or passed with incomplete work, or overdue tasks present.
  const endNearOrPassed = daysToEnd <= 2 && parseISO(phase.startDate) <= new Date();
  if (hasOverdue || (endNearOrPassed && total > 0)) return "at-risk";

  const started = done > 0 || (phase.startDate <= today && today <= phase.endDate);
  return started ? "in-progress" : "not-started";
}

export function phaseProgress(pTasks: Task[]): number {
  if (pTasks.length === 0) return 0;
  return Math.round((pTasks.filter((t) => t.completed).length / pTasks.length) * 100);
}

/** The phase currently in focus: first incomplete phase whose window hasn't fully passed. */
export function getCurrentPhase(phases: Phase[], tasks: Task[], today: string): Phase {
  const sorted = [...phases].sort((a, b) => a.phaseNumber - b.phaseNumber);
  for (const p of sorted) {
    const pTasks = tasks.filter((t) => t.phaseId === p.id);
    const complete = pTasks.length > 0 && pTasks.every((t) => t.completed);
    if (!complete && p.endDate >= today) return p;
  }
  return sorted[sorted.length - 1];
}

/* ---------------------------------------------------------------- streak */

function completionDays(activity: ActivityItem[]): Set<string> {
  const days = new Set<string>();
  for (const a of activity) {
    if (a.action === "completed") days.add(format(parseISO(a.createdAt), "yyyy-MM-dd"));
  }
  return days;
}

/** Consecutive days with ≥1 task completed. Today counts once it has a completion. */
export function computeStreak(activity: ActivityItem[]): number {
  const days = completionDays(activity);
  let cursor = new Date();
  if (!days.has(format(cursor, "yyyy-MM-dd"))) cursor = subDays(cursor, 1);
  let streak = 0;
  while (days.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export interface HeatCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3; // 0, 1–2, 3–5, 6+
  future: boolean;
}

export function computeHeatmap(activity: ActivityItem[], weeks = 21): HeatCell[][] {
  const counts = new Map<string, number>();
  for (const a of activity) {
    if (a.action !== "completed") continue;
    const d = format(parseISO(a.createdAt), "yyyy-MM-dd");
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const today = new Date();
  const start = startOfWeek(subDays(today, 7 * (weeks - 1)), { weekStartsOn: 1 });
  const columns: HeatCell[][] = [];
  let cursor = start;
  for (let w = 0; w < weeks; w++) {
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = format(cursor, "yyyy-MM-dd");
      const count = counts.get(key) ?? 0;
      const level: HeatCell["level"] = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : 3;
      column.push({ date: key, count, level, future: cursor > today });
      cursor = addDays(cursor, 1);
    }
    columns.push(column);
  }
  return columns;
}

/** Completed-per-day series for the activity chart (last N days with a little padding). */
export function dailyActivity(activity: ActivityItem[], days = 14): { date: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const a of activity) {
    if (a.action !== "completed") continue;
    const d = format(parseISO(a.createdAt), "yyyy-MM-dd");
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const out: { date: string; label: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(new Date(), i);
    const key = format(day, "yyyy-MM-dd");
    out.push({ date: key, label: format(day, "MMM d"), count: counts.get(key) ?? 0 });
  }
  return out;
}

/* -------------------------------------------------------------- countdown */

export interface Countdown {
  kind: "days" | "hours" | "submission-day" | "completed";
  value: number;
}

export function computeCountdown(deadline: string, now = new Date()): Countdown {
  const end = parseISO(deadline);
  if (now > endOfDay(end)) return { kind: "completed", value: 0 };
  if (isSameDay(now, end)) return { kind: "submission-day", value: 0 };
  const hours = differenceInHours(endOfDay(end), now);
  if (hours < 48) return { kind: "hours", value: Math.max(hours, 1) };
  return { kind: "days", value: differenceInCalendarDays(end, now) };
}

/* --------------------------------------------------------------- sorting */

const PRIORITY_RANK: Record<Task["priority"], number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Smart order: overdue → due today → upcoming (nearest first) → completed last. */
export function smartSort(tasks: Task[], today: string): Task[] {
  const bucket = (t: Task) =>
    t.completed ? 4 : isOverdue(t, today) ? 0 : isDueToday(t, today) ? 1 : t.dueDate ? 2 : 3;
  return [...tasks].sort((a, b) => {
    const ba = bucket(a);
    const bb = bucket(b);
    if (ba !== bb) return ba - bb;
    if (!a.completed && !b.completed) {
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (pr !== 0) return pr;
    }
    if (a.completed && b.completed) {
      return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/* ---------------------------------------------------------------- members */

export interface MemberStat {
  member: Member;
  assigned: number;
  completed: number;
  remaining: number;
  pct: number;
}

export function computeMemberStats(tasks: Task[], members: Member[]): MemberStat[] {
  return members.map((member) => {
    const mine = tasks.filter((t) => t.assignedTo === member.id);
    const completed = mine.filter((t) => t.completed).length;
    return {
      member,
      assigned: mine.length,
      completed,
      remaining: mine.length - completed,
      pct: mine.length === 0 ? 0 : Math.round((completed / mine.length) * 100),
    };
  });
}

/* ------------------------------------------------------------ today's focus */

/** Incomplete tasks that are overdue, due today, or High/Critical priority. */
export function todaysFocus(tasks: Task[], today: string, limit = 8): Task[] {
  const focus = tasks.filter(
    (t) => !t.completed && (isOverdue(t, today) || isDueToday(t, today) || t.priority === "critical" || t.priority === "high"),
  );
  return smartSort(focus, today).slice(0, limit);
}

/** Next important upcoming tasks by due date. */
export function upcomingTasks(tasks: Task[], today: string, limit = 5): Task[] {
  return tasks
    .filter((t) => !t.completed && t.dueDate && t.dueDate > today)
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) return (a.dueDate ?? "") < (b.dueDate ?? "") ? -1 : 1;
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    })
    .slice(0, limit);
}

"use client";

import { useWorkspace } from "@/components/providers/workspace-provider";
import { Avatar } from "@/components/ui/avatar";
import { Progress, ProgressRing } from "@/components/ui/progress";
import {
  computeCountdown,
  computeHeatmap,
  computeMemberStats,
  computeStats,
  computeStreak,
  dailyActivity,
  phaseProgress,
  todayStr,
} from "@/lib/compute";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, CircleDashed, Flag, Flame, Target } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CARD = "rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5";
const TICK = { fill: "var(--chart-tick)", fontSize: 11 } as const;

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  dataKey?: string | number;
  payload?: { label?: string; full?: string };
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-[var(--shadow-lift)]">
      {label && <div className="mb-0.5 font-medium">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="tabular-nums text-muted-foreground">
          {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { workspace, tasks, phases, members, activity, renameMember } = useWorkspace();
  const today = todayStr();
  const stats = useMemo(() => computeStats(tasks, today), [tasks, today]);
  const streak = useMemo(() => computeStreak(activity), [activity]);
  const countdown = useMemo(() => computeCountdown(workspace.deadline), [workspace.deadline]);
  const memberStats = useMemo(() => computeMemberStats(tasks, members), [tasks, members]);
  const heatmap = useMemo(() => computeHeatmap(activity), [activity]);
  const daily = useMemo(() => dailyActivity(activity, 14), [activity]);

  const phaseData = useMemo(
    () =>
      phases.map((p) => ({
        name: `P${p.phaseNumber}`,
        full: p.name,
        progress: phaseProgress(tasks.filter((t) => t.phaseId === p.id)),
      })),
    [phases, tasks],
  );

  const memberData = useMemo(
    () => memberStats.map((m) => ({ name: m.member.name.split(" ")[0], Completed: m.completed, Remaining: m.remaining })),
    [memberStats],
  );

  const donutData = [
    { name: "Completed", value: stats.completed },
    { name: "Remaining", value: stats.remaining },
  ];

  const daysLabel =
    countdown.kind === "days"
      ? `${countdown.value}`
      : countdown.kind === "hours"
        ? `${countdown.value}h`
        : countdown.kind === "submission-day"
          ? "Today"
          : "—";

  return (
    <div className="mx-auto max-w-6xl animate-slide-up space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Analytics</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Completion, workload, and momentum at a glance.
        </p>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        <StatCard icon={<Target className="size-4" />} label="Completion" value={`${stats.progress}%`} />
        <StatCard icon={<CheckCircle2 className="size-4" />} label="Completed" value={String(stats.completed)} tone="success" />
        <StatCard icon={<CircleDashed className="size-4" />} label="Remaining" value={String(stats.remaining)} />
        <StatCard icon={<AlertTriangle className="size-4" />} label="Overdue" value={String(stats.overdue)} tone="danger" />
        <StatCard icon={<Flag className="size-4" />} label="Critical open" value={String(stats.critical)} tone="warning" />
        <StatCard icon={<Flame className={cn("size-4", streak > 0 && "flame-sway")} />} label="Streak" value={`${streak}d`} />
        <StatCard icon={<Target className="size-4" />} label="Days left" value={daysLabel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* donut */}
        <div className={CARD}>
          <h2 className="text-sm font-semibold">Overall completion</h2>
          <p className="text-xs text-muted-foreground">Completed vs remaining tasks</p>
          <div className="relative mx-auto mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  innerRadius={56}
                  outerRadius={76}
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                  cornerRadius={6}
                >
                  <Cell fill="var(--accent)" />
                  <Cell fill="var(--muted)" />
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-2xl font-semibold tabular-nums">{stats.progress}%</div>
                <div className="text-[11px] text-muted-foreground">complete</div>
              </div>
            </div>
          </div>
          <div className="mt-1 flex justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" /> {stats.completed} done</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted" /> {stats.remaining} left</span>
          </div>
        </div>

        {/* daily activity */}
        <div className={cn(CARD, "lg:col-span-2")}>
          <h2 className="text-sm font-semibold">Daily activity</h2>
          <p className="text-xs text-muted-foreground">Tasks completed per day · last 14 days</p>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="act" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" name="Completed" stroke="var(--accent)" strokeWidth={2} fill="url(#act)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* by phase */}
        <div className={cn(CARD, "lg:col-span-2")}>
          <h2 className="text-sm font-semibold">Completion by phase</h2>
          <p className="text-xs text-muted-foreground">Percent of tasks done in each phase</p>
          <div className="mt-3 h-105">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={TICK} tickLine={false} axisLine={false} unit="%" />
                <YAxis type="category" dataKey="name" tick={TICK} tickLine={false} axisLine={false} width={34} />
                <Tooltip content={<ChartTooltip />} labelFormatter={(_, items) => (items?.[0]?.payload as { full?: string } | undefined)?.full ?? ""} />
                <Bar dataKey="progress" name="Complete" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* by member */}
        <div className={CARD}>
          <h2 className="text-sm font-semibold">Completion by member</h2>
          <p className="text-xs text-muted-foreground">Done vs remaining per person</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Completed" stackId="a" fill="var(--accent)" radius={[0, 0, 0, 0]} barSize={26} />
                <Bar dataKey="Remaining" stackId="a" fill="var(--muted)" stroke="var(--border-strong)" strokeWidth={0.5} radius={[4, 4, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* team cards */}
      <div className={CARD}>
        <h2 className="text-sm font-semibold">Team</h2>
        <p className="text-xs text-muted-foreground">Click a name to rename — shared with everyone instantly.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {memberStats.map(({ member, assigned, completed, remaining, pct }) => (
            <MemberCard
              key={member.id}
              name={member.name}
              avatar={member.avatar}
              assigned={assigned}
              completed={completed}
              remaining={remaining}
              pct={pct}
              onRename={(name) => void renameMember(member.id, name)}
            />
          ))}
        </div>
      </div>

      {/* streak + heatmap */}
      <div className={CARD}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Completion streak</h2>
            <p className="text-xs text-muted-foreground">Days with at least one task completed</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-warning">
            <Flame className={cn("size-3.5", streak > 0 && "flame-sway")} />
            <span className="text-xs font-bold tabular-nums">{streak} day{streak === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="mt-4 flex justify-center overflow-x-auto pb-1">
          <div className="flex gap-[3px]">
            {heatmap.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell) => (
                  <span
                    key={cell.date}
                    title={cell.future ? cell.date : `${cell.date} — ${cell.count} completed`}
                    className={cn("size-[11px] rounded-[3px]", cell.future ? "opacity-0" : `heat-${cell.level}`)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          Less
          <span className="heat-0 size-[11px] rounded-[3px]" />
          <span className="heat-1 size-[11px] rounded-[3px]" />
          <span className="heat-2 size-[11px] rounded-[3px]" />
          <span className="heat-3 size-[11px] rounded-[3px]" />
          More
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "success" | "danger" | "warning";
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
          tone === "success" && "bg-success/10 text-success",
          tone === "danger" && "bg-danger/10 text-danger",
          tone === "warning" && "bg-warning/10 text-warning",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
      </div>
    </div>
  );
}

function MemberCard({
  name,
  avatar,
  assigned,
  completed,
  remaining,
  pct,
  onRename,
}: {
  name: string;
  avatar: string;
  assigned: number;
  completed: number;
  remaining: number;
  pct: number;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  return (
    <div className="rounded-xl border border-border p-3.5">
      <div className="flex items-center gap-2.5">
        <Avatar name={name} variant={avatar} size="lg" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (draft.trim() && draft.trim() !== name) onRename(draft);
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditing(false);
              }}
              maxLength={40}
              className="h-7 w-full rounded-md border border-accent bg-card px-2 text-sm font-semibold outline-none"
            />
          ) : (
            <button
              onClick={() => {
                setDraft(name);
                setEditing(true);
              }}
              className="block max-w-full cursor-text truncate text-sm font-semibold hover:text-accent"
              title="Click to rename"
            >
              {name}
            </button>
          )}
          <div className="text-[11px] text-muted-foreground tabular-nums">
            {assigned} assigned · {completed} done
          </div>
        </div>
        <div className="relative">
          <ProgressRing value={pct} size={44} stroke={5} />
          <span className="absolute inset-0 grid place-items-center text-[9.5px] font-bold tabular-nums">{pct}%</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/60 py-1.5">
          <div className="text-sm font-semibold tabular-nums">{assigned}</div>
          <div className="text-[10px] text-muted-foreground">Assigned</div>
        </div>
        <div className="rounded-lg bg-success/10 py-1.5">
          <div className="text-sm font-semibold tabular-nums text-success">{completed}</div>
          <div className="text-[10px] text-success/80">Completed</div>
        </div>
        <div className="rounded-lg bg-warning/10 py-1.5">
          <div className="text-sm font-semibold tabular-nums text-warning">{remaining}</div>
          <div className="text-[10px] text-warning/80">Remaining</div>
        </div>
      </div>
      <Progress value={pct} className="mt-3 h-1" />
    </div>
  );
}

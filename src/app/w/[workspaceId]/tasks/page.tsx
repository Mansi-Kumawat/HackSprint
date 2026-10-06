"use client";

import { useUI } from "@/components/app-shell";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { TaskRow } from "@/components/task-row";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { isDueToday, isOverdue, smartSort, todayStr } from "@/lib/compute";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, Filter, Plus, Search, SearchX, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Mode = "all" | "active" | "completed";

const CHIP_DEFS = [
  { key: "overdue", label: "Overdue" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "due-today", label: "Due Today" },
] as const;

type Chip = (typeof CHIP_DEFS)[number]["key"];

export default function TasksPage() {
  const { tasks, phases, members } = useWorkspace();
  const { openCreateTask, openSearch } = useUI();

  const [mode, setMode] = useState<Mode>("all");
  const [chips, setChips] = useState<Set<Chip>>(new Set());
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* URL deep-links, e.g. ?filter=due-today (keyboard shortcut T) */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const f = params.get("filter");
    if (f === "due-today") setChips(new Set(["due-today"]));
    if (f === "overdue") setChips(new Set(["overdue"]));
    if (f === "critical") setChips(new Set(["critical"]));
    const member = params.get("member");
    if (member) setMemberFilter(member);
  }, []);

  const today = todayStr();

  const phaseName = (id: string) => phases.find((p) => p.id === id)?.name.toLowerCase() ?? "";
  const memberName = (id: string) =>
    id === "everyone"
      ? "everyone shared"
      : (members.find((m) => m.id === id)?.name.toLowerCase() ?? "");

  const filtered = useMemo(() => {
    let list = tasks;
    if (mode === "active") list = list.filter((t) => !t.completed);
    if (mode === "completed") list = list.filter((t) => t.completed);

    if (chips.has("overdue")) list = list.filter((t) => isOverdue(t, today));
    if (chips.has("critical")) list = list.filter((t) => t.priority === "critical" && !t.completed);
    if (chips.has("high")) list = list.filter((t) => (t.priority === "high" || t.priority === "critical") && !t.completed);
    if (chips.has("due-today")) list = list.filter((t) => isDueToday(t, today));

    if (phaseFilter !== "all") list = list.filter((t) => t.phaseId === phaseFilter);
    if (memberFilter === "everyone") list = list.filter((t) => t.assignedTo === "everyone");
    else if (memberFilter !== "all") list = list.filter((t) => t.assignedTo === memberFilter);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          phaseName(t.phaseId).includes(q) ||
          memberName(t.assignedTo).includes(q),
      );
    }
    return smartSort(list, today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, mode, chips, phaseFilter, memberFilter, query, today]);

  const hasFilters =
    chips.size > 0 || phaseFilter !== "all" || memberFilter !== "all" || query.trim() !== "";
  const clearFilters = () => {
    setChips(new Set());
    setPhaseFilter("all");
    setMemberFilter("all");
    setQuery("");
  };

  const toggleChip = (key: Chip) =>
    setChips((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="mx-auto max-w-6xl animate-slide-up space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Tasks</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">
            {filtered.length} shown · {completedCount} of {tasks.length} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 lg:hidden" onClick={() => setFiltersOpen((v) => !v)}>
            <Filter className={cn(filtersOpen && "text-accent")} />
            Filters
            {hasFilters && <span className="ml-0.5 size-1.5 rounded-full bg-accent" />}
          </Button>
          <Button onClick={() => openCreateTask(phaseFilter !== "all" ? phaseFilter : undefined)}>
            <Plus /> Add Task
          </Button>
        </div>
      </div>

      {/* filter bar */}
      <div className={cn("rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]", !filtersOpen && "hidden lg:block")}>
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          {/* mode toggle */}
          <div className="flex rounded-lg bg-muted p-1">
            {(["all", "active", "completed"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "h-7 flex-1 cursor-pointer rounded-md px-3 text-xs font-medium capitalize transition-all lg:flex-none",
                  mode === m ? "bg-card text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* stackable chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CHIP_DEFS.map((c) => (
              <button
                key={c.key}
                onClick={() => toggleChip(c.key)}
                className={cn(
                  "h-7 cursor-pointer rounded-full border px-2.5 text-xs font-medium transition-all",
                  chips.has(c.key)
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            <Select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} className="h-8 w-40 text-xs" aria-label="Filter by phase">
              <option value="all">All phases</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  P{p.phaseNumber} · {p.name}
                </option>
              ))}
            </Select>
            <Select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="h-8 w-36 text-xs" aria-label="Filter by member">
              <option value="all">All members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
              <option value="everyone">Shared (Everyone)</option>
            </Select>
            <div className="relative min-w-40 flex-1 lg:max-w-60 lg:flex-none">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by keyword…"
                className="h-8 pl-8 text-xs"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-2.5 flex items-center border-t border-border pt-2.5 text-xs text-muted-foreground">
            <span>{filtered.length} result{filtered.length === 1 ? "" : "s"} with current filters</span>
            <button onClick={clearFilters} className="ml-auto cursor-pointer font-medium text-accent hover:underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* list */}
      {filtered.length === 0 ? (
        <EmptyState mode={mode} hasFilters={hasFilters} onClear={clearFilters} onSearch={openSearch} onAdd={() => openCreateTask()} isEmpty={tasks.length === 0} />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-soft)] sm:p-2">
          {filtered.map((t: Task) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  mode,
  hasFilters,
  onClear,
  onSearch,
  onAdd,
  isEmpty,
}: {
  mode: Mode;
  hasFilters: boolean;
  onClear: () => void;
  onSearch: () => void;
  onAdd: () => void;
  isEmpty: boolean;
}) {
  if (isEmpty && !hasFilters) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-card/50 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Sparkles className="size-5" />
        </span>
        <p className="text-[15px] font-medium">Your board is clear. Time to build something.</p>
        <Button size="sm" onClick={onAdd}>
          <Plus /> Add your first task
        </Button>
      </div>
    );
  }
  if (hasFilters || mode !== "all") {
    if (mode === "completed" && !hasFilters) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-card/50 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <p className="text-[15px] font-medium">Nothing completed yet.</p>
          <p className="text-sm text-muted-foreground">Your first checkmark is waiting.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-card/50 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <SearchX className="size-5" />
        </span>
        <p className="text-[15px] font-medium">No tasks match your search.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onClear}>
            Clear filters
          </Button>
          <Button size="sm" variant="ghost" onClick={onSearch}>
            <Search /> Global search
          </Button>
        </div>
      </div>
    );
  }
  return null;
}

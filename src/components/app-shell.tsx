"use client";

import { useWorkspace, LAST_WORKSPACE_KEY } from "@/components/providers/workspace-provider";
import { SearchPalette } from "@/components/search-palette";
import { TaskModal, type TaskModalState } from "@/components/task-modal";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { extractWorkspaceId } from "@/lib/validation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  CalendarDays,
  Check,
  Copy,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogIn,
  Milestone,
  Moon,
  Plus,
  Search,
  Sun,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

/* ------------------------------------------------------------- UI context */

interface UIContextValue {
  openCreateTask: (defaultPhaseId?: string) => void;
  openEditTask: (taskId: string) => void;
  openSearch: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within AppShell");
  return ctx;
}

/* ------------------------------------------------------------------- nav */

const NAV = [
  { href: "", label: "Dashboard", icon: LayoutDashboard, key: "D" },
  { href: "/tasks", label: "Tasks", icon: ListChecks, key: "T" },
  { href: "/phases", label: "Phases", icon: Milestone, key: "P" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, key: "" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, key: "" },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="relative overflow-hidden"
    >
      {mounted ? (
        dark ? <Sun className="animate-zoom-in" /> : <Moon className="animate-zoom-in" />
      ) : (
        <span className="size-4" />
      )}
    </Button>
  );
}

function ShareMenu() {
  const { workspace } = useWorkspace();
  const [copied, setCopied] = useState<"link" | "id" | null>(null);

  const copy = async (kind: "link" | "id") => {
    const url = `${window.location.origin}/w/${workspace.id}`;
    try {
      await navigator.clipboard.writeText(kind === "link" ? url : workspace.id);
      setCopied(kind);
      toast.success(kind === "link" ? "Workspace link copied" : "Workspace ID copied");
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 sm:h-9 sm:px-3.5">
          <Link2 />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Share this workspace</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => copy("link")}>
          {copied === "link" ? <Check className="text-success" /> : <Copy />} Copy workspace link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copy("id")}>
          {copied === "id" ? <Check className="text-success" /> : <Copy />} Copy workspace ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2.5 pb-1.5 pt-1 text-[11px] leading-relaxed text-muted-foreground">
          Anyone with this link can view and edit the workspace. No account needed.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function JoinWorkspace({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const join = async () => {
    const id = extractWorkspaceId(value);
    if (!id) {
      toast.error("Enter a valid workspace ID or link");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/w/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      localStorage.setItem(LAST_WORKSPACE_KEY, id);
      toast.success("Workspace joined");
      router.push(`/w/${id}`);
    } catch {
      toast.error("Workspace not found. Check the ID or link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className={cn("flex gap-1.5", compact ? "" : "px-1")}
      onSubmit={(e) => {
        e.preventDefault();
        void join();
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Join with ID or link…"
        className="h-8 text-xs"
        aria-label="Join workspace"
      />
      <Button type="submit" variant="secondary" size="sm" className="h-8 shrink-0" disabled={busy}>
        <LogIn className="size-3.5" />
        Join
      </Button>
    </form>
  );
}

function TeamMini() {
  const { members, tasks, renameMember } = useWorkspace();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-0.5">
      {members.map((m) => {
        const mine = tasks.filter((t) => t.assignedTo === m.id);
        const done = mine.filter((t) => t.completed).length;
        return (
          <div key={m.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5">
            <Avatar name={m.name} variant={m.avatar} size="sm" />
            {editing === m.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  if (draft.trim() && draft.trim() !== m.name) void renameMember(m.id, draft);
                  setEditing(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditing(null);
                }}
                className="h-6 w-full min-w-0 rounded-md border border-accent bg-card px-1.5 text-xs outline-none"
                maxLength={40}
              />
            ) : (
              <button
                className="min-w-0 flex-1 cursor-text truncate text-left text-[13px] font-medium text-foreground/90 hover:text-foreground"
                title="Click to rename"
                onClick={() => {
                  setEditing(m.id);
                  setDraft(m.name);
                }}
              >
                {m.name}
              </button>
            )}
            <span className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground">
              {done}/{mine.length}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- shell */

export function AppShell({ children }: { children: ReactNode }) {
  const { workspace, phases, members } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const base = `/w/${workspace.id}`;

  const [modal, setModal] = useState<TaskModalState | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  /* Remember the last visited workspace */
  useEffect(() => {
    try {
      localStorage.setItem(LAST_WORKSPACE_KEY, workspace.id);
    } catch {
      /* private mode */
    }
  }, [workspace.id]);

  const openCreateTask = useCallback((defaultPhaseId?: string) => {
    setModal({ mode: "create", defaultPhaseId });
  }, []);
  const openEditTask = useCallback((taskId: string) => {
    setModal({ mode: "edit", taskId });
  }, []);
  const openSearch = useCallback(() => setSearchOpen(true), []);

  const ui = useMemo<UIContextValue>(
    () => ({ openCreateTask, openEditTask, openSearch }),
    [openCreateTask, openEditTask, openSearch],
  );

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (typing) return;

      switch (e.key) {
        case "n":
        case "N":
          e.preventDefault();
          openCreateTask();
          break;
        case "/":
          e.preventDefault();
          setSearchOpen(true);
          break;
        case "t":
        case "T":
          router.push(`${base}/tasks?filter=due-today`);
          break;
        case "d":
        case "D":
          router.push(base);
          break;
        case "p":
        case "P":
          router.push(`${base}/phases`);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [base, openCreateTask, router]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const isActive = (href: string) =>
    href === "" ? pathname === base || pathname === `${base}/` : pathname.startsWith(`${base}${href}`);

  return (
    <UIContext.Provider value={ui}>
      <div className="flex min-h-screen">
        {/* ------------------------------------------------------- sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card lg:flex">
          <div className="flex items-center gap-2.5 px-4 pb-5 pt-5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-[0_2px_8px_-2px_var(--accent)]">
              <Zap className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold tracking-[-0.02em]">HackSprint</div>
              <div className="truncate text-[11px] text-muted-foreground">{workspace.name}</div>
            </div>
          </div>

          <div className="px-3">
            <Button className="w-full justify-between" onClick={() => openCreateTask()}>
              <span className="flex items-center gap-1.5">
                <Plus /> New task
              </span>
              <kbd className="rounded bg-white/15 px-1.5 text-[10px] font-medium">N</kbd>
            </Button>
            <button
              onClick={openSearch}
              className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <Search className="size-3.5" /> Search tasks…
              <kbd className="ml-auto rounded border border-border bg-card px-1.5 text-[10px]">/</kbd>
            </button>
          </div>

          <nav className="mt-4 flex-1 space-y-0.5 px-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={`${base}${item.href}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-accent-soft text-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
                {item.key && (
                  <kbd className="ml-auto rounded border border-border bg-card px-1.5 text-[10px] text-muted-foreground/70">
                    {item.key}
                  </kbd>
                )}
              </Link>
            ))}
          </nav>

          <div className="space-y-3 border-t border-border p-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between px-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Team
                <span className="normal-case tracking-normal">{members.length} members</span>
              </div>
              <TeamMini />
            </div>
            <JoinWorkspace />
            <div className="px-1 text-[10.5px] leading-relaxed text-muted-foreground/70">
              Phase 0–{phases.length - 1} · Deadline Oct 30, 2026
            </div>
          </div>
        </aside>

        {/* -------------------------------------------------------- topbar */}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:gap-3 sm:px-6">
            <Link href={base} className="flex items-center gap-2 lg:hidden">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Zap className="size-3.5" />
              </span>
              <span className="text-[15px] font-semibold tracking-[-0.02em]">HackSprint</span>
            </Link>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
              <span className="tabular-nums">{today}</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <div className="mr-1 hidden items-center -space-x-1.5 md:flex">
                {members.map((m) => (
                  <Avatar
                    key={m.id}
                    name={m.name}
                    variant={m.avatar}
                    size="md"
                    className="ring-2 ring-background"
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground lg:hidden">{today}</span>
              <ThemeToggle />
              <ShareMenu />
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pt-6">{children}</main>
        </div>

        {/* ----------------------------------------------------- bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={`${base}${item.href}`}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive(item.href) ? "text-accent" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" strokeWidth={isActive(item.href) ? 2.2 : 1.8} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Floating add button on mobile */}
      <button
        onClick={() => openCreateTask()}
        aria-label="New task"
        className="fixed bottom-20 right-4 z-30 flex size-12 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-lift)] transition-transform active:scale-95 lg:hidden"
      >
        <Plus className="size-5" />
      </button>

      <TaskModal state={modal} onClose={() => setModal(null)} />
      <SearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(id) => {
          setSearchOpen(false);
          openEditTask(id);
        }}
      />
    </UIContext.Provider>
  );
}

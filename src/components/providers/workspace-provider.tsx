"use client";

import type {
  ActivityItem,
  Member,
  Phase,
  Task,
  TaskInput,
  Workspace,
  WorkspaceBundle,
} from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

export const LAST_WORKSPACE_KEY = "hacksprint:last-workspace";

interface WorkspaceContextValue {
  workspace: Workspace;
  members: Member[];
  phases: Phase[];
  tasks: Task[];
  activity: ActivityItem[];
  addTask: (input: TaskInput) => Promise<Task | null>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  duplicateTask: (id: string) => Promise<void>;
  renameMember: (id: string, name: string) => Promise<void>;
  workspaceUrl: string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({
  bundle,
  children,
}: {
  bundle: WorkspaceBundle;
  children: ReactNode;
}) {
  const [workspace] = useState(bundle.workspace);
  const [members, setMembers] = useState<Member[]>(bundle.members);
  const [phases] = useState<Phase[]>(bundle.phases);
  const [taskList, setTaskList] = useState<Task[]>(bundle.tasks);
  const [activity, setActivity] = useState<ActivityItem[]>(bundle.activity);

  const base = `/api/w/${workspace.id}`;

  /** Silently re-sync activity (streak / heatmap source) from the server. */
  const syncActivity = useCallback(async () => {
    try {
      const res = await fetch(base, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as WorkspaceBundle;
      setActivity(data.activity);
    } catch {
      /* non-fatal */
    }
  }, [base]);

  const addTask = useCallback(
    async (input: TaskInput): Promise<Task | null> => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: Task = {
        id: tempId,
        workspaceId: workspace.id,
        phaseId: input.phaseId,
        title: input.title,
        description: input.description ?? "",
        assignedTo: input.assignedTo ?? "everyone",
        priority: input.priority ?? "medium",
        dueDate: input.dueDate ?? null,
        completed: false,
        completedAt: null,
        tags: input.tags ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTaskList((prev) => [...prev, optimistic]);
      try {
        const res = await fetch(`${base}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create task");
        const { task } = (await res.json()) as { task: Task };
        setTaskList((prev) => prev.map((t) => (t.id === tempId ? task : t)));
        toast.success("Task added");
        return task;
      } catch (err) {
        setTaskList((prev) => prev.filter((t) => t.id !== tempId));
        toast.error(err instanceof Error ? err.message : "Failed to create task");
        return null;
      }
    },
    [base, workspace.id],
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      try {
        const res = await fetch(`${base}/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update task");
        const { task } = (await res.json()) as { task: Task };
        setTaskList((prev) => prev.map((t) => (t.id === id ? task : t)));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update task");
        // resync from server
        const res = await fetch(base, { cache: "no-store" }).catch(() => null);
        if (res?.ok) {
          const data = (await res.json()) as WorkspaceBundle;
          setTaskList(data.tasks);
        }
      }
    },
    [base],
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const task = taskList.find((t) => t.id === id);
      if (!task || task.id.startsWith("temp-")) return;
      const next = !task.completed;
      const now = new Date().toISOString();
      setTaskList((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, completed: next, completedAt: next ? now : null } : t,
        ),
      );
      // Optimistic activity entry so streak/heatmap update instantly
      setActivity((prev) => [
        ...prev,
        {
          id: `temp-${crypto.randomUUID()}`,
          workspaceId: workspace.id,
          taskId: id,
          action: next ? "completed" : "reopened",
          createdAt: now,
        },
      ]);
      try {
        const res = await fetch(`${base}/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: next }),
        });
        if (!res.ok) throw new Error("Failed to update task");
        const { task: saved } = (await res.json()) as { task: Task };
        setTaskList((prev) => prev.map((t) => (t.id === id ? saved : t)));
        void syncActivity();
        if (next) toast.success("Task completed", { description: task.title });
      } catch {
        setTaskList((prev) =>
          prev.map((t) => (t.id === id ? { ...t, completed: task.completed, completedAt: task.completedAt } : t)),
        );
        setActivity((prev) => prev.filter((a) => a.taskId !== id || a.createdAt !== now));
        toast.error("Could not update the task");
      }
    },
    [base, taskList, syncActivity, workspace.id],
  );

  const removeTask = useCallback(
    async (id: string) => {
      const snapshot = taskList;
      setTaskList((prev) => prev.filter((t) => t.id !== id));
      try {
        const res = await fetch(`${base}/tasks/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete task");
        toast.success("Task deleted");
      } catch (err) {
        setTaskList(snapshot);
        toast.error(err instanceof Error ? err.message : "Failed to delete task");
      }
    },
    [base, taskList],
  );

  const duplicateTask = useCallback(
    async (id: string) => {
      const source = taskList.find((t) => t.id === id);
      if (!source) return;
      await addTask({
        title: `${source.title} (copy)`,
        description: source.description,
        phaseId: source.phaseId,
        assignedTo: source.assignedTo,
        priority: source.priority,
        dueDate: source.dueDate,
        tags: source.tags,
      });
    },
    [addTask, taskList],
  );

  const renameMember = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const snapshot = members;
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, name: trimmed } : m)));
      try {
        const res = await fetch(`${base}/members/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to rename member");
      } catch (err) {
        setMembers(snapshot);
        toast.error(err instanceof Error ? err.message : "Failed to rename member");
      }
    },
    [base, members],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspace,
      members,
      phases,
      tasks: taskList,
      activity,
      addTask,
      updateTask,
      toggleTask,
      removeTask,
      duplicateTask,
      renameMember,
      workspaceUrl: `/w/${workspace.id}`,
    }),
    [workspace, members, phases, taskList, activity, addTask, updateTask, toggleTask, removeTask, duplicateTask, renameMember],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

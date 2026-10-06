import { db } from "@/db";
import { activity, phases, tasks, teamMembers, workspaces } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { WorkspaceBundle } from "./types";

/**
 * Loads the full workspace bundle. Small dataset (~200 rows) — loaded once and
 * shared across all pages via the client provider so every view stays in sync.
 */
export async function getWorkspaceBundle(id: string): Promise<WorkspaceBundle | null> {
  const wsRows = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  if (wsRows.length === 0) return null;
  const ws = wsRows[0];

  const [memberRows, phaseRows, taskRows, activityRows] = await Promise.all([
    db.select().from(teamMembers).where(eq(teamMembers.workspaceId, id)).orderBy(asc(teamMembers.avatar)),
    db.select().from(phases).where(eq(phases.workspaceId, id)).orderBy(asc(phases.phaseNumber)),
    db.select().from(tasks).where(eq(tasks.workspaceId, id)).orderBy(asc(tasks.createdAt)),
    db.select().from(activity).where(eq(activity.workspaceId, id)).orderBy(asc(activity.createdAt)),
  ]);

  return {
    workspace: {
      id: ws.id,
      name: ws.name,
      hackathonName: ws.hackathonName,
      deadline: ws.deadline,
      themeDefault: ws.themeDefault,
      createdAt: ws.createdAt.toISOString(),
    },
    members: memberRows.map((m) => ({
      id: m.id,
      workspaceId: m.workspaceId,
      name: m.name,
      avatar: m.avatar,
    })),
    phases: phaseRows.map((p) => ({
      id: p.id,
      workspaceId: p.workspaceId,
      phaseNumber: p.phaseNumber,
      name: p.name,
      description: p.description,
      startDate: p.startDate,
      endDate: p.endDate,
    })),
    tasks: taskRows.map((t) => ({
      id: t.id,
      workspaceId: t.workspaceId,
      phaseId: t.phaseId,
      title: t.title,
      description: t.description,
      assignedTo: t.assignedTo,
      priority: t.priority,
      dueDate: t.dueDate,
      completed: t.completed,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      tags: t.tags,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    activity: activityRows.map((a) => ({
      id: a.id,
      workspaceId: a.workspaceId,
      taskId: a.taskId,
      action: a.action,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

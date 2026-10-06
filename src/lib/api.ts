import { db } from "@/db";
import { phases, tasks, teamMembers, workspaces } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { Task } from "./types";
import { WORKSPACE_ID_RE } from "./validation";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Validates the id format and that the workspace exists. */
export async function requireWorkspace(workspaceId: string): Promise<boolean> {
  if (!WORKSPACE_ID_RE.test(workspaceId)) return false;
  const rows = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return rows.length > 0;
}

export async function phaseInWorkspace(phaseId: string, workspaceId: string): Promise<boolean> {
  const rows = await db
    .select({ id: phases.id })
    .from(phases)
    .where(and(eq(phases.id, phaseId), eq(phases.workspaceId, workspaceId)))
    .limit(1);
  return rows.length > 0;
}

export async function memberInWorkspace(memberId: string, workspaceId: string): Promise<boolean> {
  const rows = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.workspaceId, workspaceId)))
    .limit(1);
  return rows.length > 0;
}

export type TaskRow = typeof tasks.$inferSelect;

export function serializeTask(t: TaskRow): Task {
  return {
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
  };
}

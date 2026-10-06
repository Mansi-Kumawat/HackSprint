import { jsonError, memberInWorkspace, phaseInWorkspace, requireWorkspace, serializeTask } from "@/lib/api";
import { taskUpdateSchema } from "@/lib/validation";
import { db } from "@/db";
import { activity, tasks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ workspaceId: string; taskId: string }> };

async function findTask(workspaceId: string, taskId: string) {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .limit(1);
  return rows[0] ?? null;
}

/** PATCH — update fields and/or toggle completion (writes to the activity log). */
export async function PATCH(request: Request, { params }: Ctx) {
  const { workspaceId, taskId } = await params;
  if (!(await requireWorkspace(workspaceId))) return jsonError(404, "Workspace not found");

  const existing = await findTask(workspaceId, taskId);
  if (!existing) return jsonError(404, "Task not found");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid update");
  }
  const patch = parsed.data;

  if (patch.phaseId && !(await phaseInWorkspace(patch.phaseId, workspaceId))) {
    return jsonError(400, "Phase does not belong to this workspace");
  }
  if (patch.assignedTo && patch.assignedTo !== "everyone" && !(await memberInWorkspace(patch.assignedTo, workspaceId))) {
    return jsonError(400, "Assignee does not belong to this workspace");
  }

  const toggling = typeof patch.completed === "boolean" && patch.completed !== existing.completed;

  const [updated] = await db
    .update(tasks)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.phaseId !== undefined ? { phaseId: patch.phaseId } : {}),
      ...(patch.assignedTo !== undefined ? { assignedTo: patch.assignedTo } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(toggling
        ? {
            completed: patch.completed!,
            completedAt: patch.completed ? new Date() : null,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .returning();

  if (toggling) {
    await db.insert(activity).values({
      workspaceId,
      taskId,
      action: patch.completed ? "completed" : "reopened",
    });
  }

  return NextResponse.json({ task: serializeTask(updated) });
}

/** DELETE — remove a task (activity log survives with task_id set to null). */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { workspaceId, taskId } = await params;
  if (!(await requireWorkspace(workspaceId))) return jsonError(404, "Workspace not found");

  const existing = await findTask(workspaceId, taskId);
  if (!existing) return jsonError(404, "Task not found");

  await db.insert(activity).values({ workspaceId, taskId, action: "deleted" });
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)));

  return NextResponse.json({ ok: true });
}

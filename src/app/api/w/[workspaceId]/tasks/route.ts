import { jsonError, memberInWorkspace, phaseInWorkspace, requireWorkspace, serializeTask } from "@/lib/api";
import { taskCreateSchema } from "@/lib/validation";
import { db } from "@/db";
import { activity, tasks } from "@/db/schema";
import { NextResponse } from "next/server";

/** POST /api/w/[workspaceId]/tasks — create a task. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  if (!(await requireWorkspace(workspaceId))) return jsonError(404, "Workspace not found");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid task");
  }
  const input = parsed.data;

  if (!(await phaseInWorkspace(input.phaseId, workspaceId))) {
    return jsonError(400, "Phase does not belong to this workspace");
  }
  if (input.assignedTo !== "everyone" && !(await memberInWorkspace(input.assignedTo, workspaceId))) {
    return jsonError(400, "Assignee does not belong to this workspace");
  }

  const [created] = await db
    .insert(tasks)
    .values({
      workspaceId,
      phaseId: input.phaseId,
      title: input.title,
      description: input.description,
      assignedTo: input.assignedTo,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
      tags: input.tags,
    })
    .returning();

  await db.insert(activity).values({ workspaceId, taskId: created.id, action: "created" });

  return NextResponse.json({ task: serializeTask(created) }, { status: 201 });
}

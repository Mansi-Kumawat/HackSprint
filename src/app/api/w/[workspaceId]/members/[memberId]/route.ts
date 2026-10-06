import { jsonError, requireWorkspace } from "@/lib/api";
import { memberUpdateSchema } from "@/lib/validation";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** PATCH /api/w/[workspaceId]/members/[memberId] — rename a team member. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> },
) {
  const { workspaceId, memberId } = await params;
  if (!(await requireWorkspace(workspaceId))) return jsonError(404, "Workspace not found");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = memberUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid name");

  const [updated] = await db
    .update(teamMembers)
    .set({ name: parsed.data.name })
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.workspaceId, workspaceId)))
    .returning();

  if (!updated) return jsonError(404, "Member not found");
  return NextResponse.json({
    member: { id: updated.id, workspaceId: updated.workspaceId, name: updated.name, avatar: updated.avatar },
  });
}

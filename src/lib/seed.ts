import { db } from "@/db";
import { phases, tasks, teamMembers, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { MEMBER_NAMES, SEED_PHASES } from "./seed-data";

const newSlug = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 16);

async function uniqueWorkspaceId(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const id = newSlug();
    const existing = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);
    if (existing.length === 0) return id;
  }
  // Practically unreachable; fall back to a longer slug.
  return newSlug() + newSlug().slice(0, 4);
}

/** Creates a workspace and seeds it with team, phases and the full hackathon plan. */
export async function createWorkspace(): Promise<string> {
  const id = await uniqueWorkspaceId();

  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({ id });

    const members = await tx
      .insert(teamMembers)
      .values([
        { workspaceId: id, name: MEMBER_NAMES[0], avatar: "v1" },
        { workspaceId: id, name: MEMBER_NAMES[1], avatar: "v2" },
        { workspaceId: id, name: MEMBER_NAMES[2], avatar: "v3" },
      ])
      .returning({ id: teamMembers.id });

    for (const phase of SEED_PHASES) {
      const [insertedPhase] = await tx
        .insert(phases)
        .values({
          workspaceId: id,
          phaseNumber: phase.number,
          name: phase.name,
          description: phase.description,
          startDate: phase.start,
          endDate: phase.end,
        })
        .returning({ id: phases.id });

      const rows = phase.tasks.map((raw) => {
        const task = typeof raw === "string" ? { t: raw } : raw;
        const assignee = task.a ?? phase.a ?? "everyone";
        return {
          workspaceId: id,
          phaseId: insertedPhase.id,
          title: task.t,
          description: "",
          assignedTo: assignee === "everyone" ? "everyone" : members[assignee].id,
          priority: task.p ?? ("medium" as const),
          dueDate: phase.end, // default due date = phase end date
          tags: task.tags ?? phase.tags ?? [],
        };
      });

      if (rows.length > 0) {
        await tx.insert(tasks).values(rows);
      }
    }
  });

  return id;
}

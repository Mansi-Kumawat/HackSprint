import { createWorkspace } from "@/lib/seed";
import { getWorkspaceBundle } from "@/lib/workspace";
import { NextResponse } from "next/server";

/** POST /api/workspaces — creates and seeds a new shared workspace. */
export async function POST() {
  try {
    const id = await createWorkspace();
    const bundle = await getWorkspaceBundle(id);
    return NextResponse.json({ id, bundle }, { status: 201 });
  } catch (err) {
    console.error("Failed to create workspace", err);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}

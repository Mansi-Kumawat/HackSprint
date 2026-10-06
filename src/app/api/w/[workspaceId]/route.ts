import { getWorkspaceBundle } from "@/lib/workspace";
import { WORKSPACE_ID_RE } from "@/lib/validation";
import { NextResponse } from "next/server";

/** GET /api/w/[workspaceId] — validates a workspace and returns its bundle. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  if (!WORKSPACE_ID_RE.test(workspaceId)) {
    return NextResponse.json({ error: "Invalid workspace id" }, { status: 400 });
  }
  const bundle = await getWorkspaceBundle(workspaceId);
  if (!bundle) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  return NextResponse.json(bundle);
}

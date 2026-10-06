import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { getWorkspaceBundle } from "@/lib/workspace";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const bundle = await getWorkspaceBundle(workspaceId);
  if (!bundle) notFound();

  return (
    <WorkspaceProvider bundle={bundle}>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}

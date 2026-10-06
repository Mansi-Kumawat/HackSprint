import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Zap className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-[-0.02em]">Workspace not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This workspace doesn&apos;t exist or the link is mistyped. Double-check the ID, or start a
          fresh workspace.
        </p>
        <Link href="/" className="mt-6">
          <Button>Open HackSprint</Button>
        </Link>
      </div>
    </main>
  );
}

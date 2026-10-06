"use client";

import { useUI } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Avatar, EveryoneAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CompletionCheckbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fmtShort, isDueSoon, isDueToday, isOverdue, todayStr } from "@/lib/compute";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, CalendarClock, Check, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

const PRIORITY_VARIANT = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
} as const;

export function TaskRow({
  task,
  showPhase = true,
}: {
  task: Task;
  showPhase?: boolean;
}) {
  const { phases, members, toggleTask, updateTask, duplicateTask, removeTask } = useWorkspace();
  const { openEditTask } = useUI();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const today = todayStr();
  const phase = phases.find((p) => p.id === task.phaseId);
  const member = members.find((m) => m.id === task.assignedTo);
  const overdue = isOverdue(task, today);
  const dueToday = isDueToday(task, today);
  const dueSoon = isDueSoon(task, today);

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-muted/60 sm:items-center",
        task.completed && "opacity-60",
        !task.completed && task.priority === "critical" && "bg-danger/[0.035]",
      )}
    >
      <CompletionCheckbox
        checked={task.completed}
        onToggle={() => void toggleTask(task.id)}
        label={task.completed ? `Reopen “${task.title}”` : `Complete “${task.title}”`}
        className="sm:mt-0"
      />

      <div className="min-w-0 flex-1">
        <button
          onClick={() => openEditTask(task.id)}
          className={cn(
            "block max-w-full cursor-pointer truncate text-left text-[13.5px] font-medium leading-snug tracking-[-0.01em] hover:text-accent",
            task.completed && "text-muted-foreground line-through decoration-muted-foreground/50",
          )}
        >
          {task.title}
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {task.completed && (
            <Badge variant="success" className="px-1.5 py-0 text-[10px]">
              Completed
            </Badge>
          )}
          {showPhase && phase && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <span className="inline-flex size-3.5 items-center justify-center rounded bg-accent-soft text-[8.5px] font-bold text-accent">
                {phase.phaseNumber}
              </span>
              <span className="hidden max-w-32 truncate sm:inline">{phase.name}</span>
            </span>
          )}
          <Badge variant={PRIORITY_VARIANT[task.priority]} className="px-1.5 py-0 text-[10px] capitalize">
            {task.priority}
          </Badge>
          {task.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] tabular-nums",
                overdue
                  ? "font-semibold text-danger"
                  : dueToday
                    ? "font-semibold text-warning"
                    : dueSoon
                      ? "font-medium text-warning"
                      : "text-muted-foreground",
              )}
            >
              <CalendarClock className="size-3" />
              {fmtShort(task.dueDate)}
              {overdue && " · overdue"}
              {dueToday && " · today"}
            </span>
          )}
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="hidden rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground md:inline"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {member ? (
          <Avatar name={member.name} variant={member.avatar} size="sm" />
        ) : (
          <EveryoneAvatar size="sm" />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Task actions"
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditTask(task.id)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void toggleTask(task.id)}>
              <Check /> {task.completed ? "Reopen task" : "Mark complete"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void duplicateTask(task.id)}>
              <Copy /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeft className="text-muted-foreground" /> Move to phase
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuLabel>Move to…</DropdownMenuLabel>
                {phases.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    disabled={p.id === task.phaseId}
                    onClick={() => void updateTask(task.id, { phaseId: p.id })}
                  >
                    <span className="inline-flex size-4 items-center justify-center rounded bg-accent-soft text-[9px] font-bold text-accent">
                      {p.phaseNumber}
                    </span>
                    <span className="truncate">{p.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-danger data-[highlighted]:bg-danger/10 [&_svg]:text-danger"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this task?"
        description={`“${task.title}” will be permanently removed. This can't be undone.`}
        onConfirm={() => void removeTask(task.id)}
      />
    </div>
  );
}

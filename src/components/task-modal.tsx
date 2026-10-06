"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/input";
import { DEFAULT_TAGS, PRIORITIES, type Priority, type Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type TaskModalState =
  | { mode: "create"; defaultPhaseId?: string }
  | { mode: "edit"; taskId: string };

const PRIORITY_STYLES: Record<Priority, { active: string; label: string }> = {
  critical: { active: "border-danger bg-danger/10 text-danger", label: "Critical" },
  high: { active: "border-warning bg-warning/10 text-warning", label: "High" },
  medium: {
    active: "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    label: "Medium",
  },
  low: { active: "border-foreground/30 bg-muted text-foreground", label: "Low" },
};

export function TaskModal({ state, onClose }: { state: TaskModalState | null; onClose: () => void }) {
  const { phases, members, tasks, addTask, updateTask, removeTask } = useWorkspace();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editingTask: Task | null =
    state?.mode === "edit" ? (tasks.find((t) => t.id === state.taskId) ?? null) : null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [assignedTo, setAssignedTo] = useState("everyone");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [busy, setBusy] = useState(false);

  /* hydrate form when opened */
  useEffect(() => {
    if (!state) return;
    if (state.mode === "edit" && editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setPhaseId(editingTask.phaseId);
      setAssignedTo(editingTask.assignedTo);
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate ?? "");
      setTags(editingTask.tags);
    } else if (state.mode === "create") {
      const fallbackPhase = state.defaultPhaseId ?? phases[0]?.id ?? "";
      setTitle("");
      setDescription("");
      setPhaseId(fallbackPhase);
      setAssignedTo("everyone");
      setPriority("medium");
      const ph = phases.find((p) => p.id === fallbackPhase);
      setDueDate(ph?.endDate ?? "");
      setTags([]);
    }
    setCustomTag("");
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const phase = useMemo(() => phases.find((p) => p.id === phaseId), [phases, phaseId]);
  const allTags = useMemo(
    () => Array.from(new Set([...DEFAULT_TAGS, ...tags])),
    [tags],
  );

  if (!state) return null;
  if (state.mode === "edit" && !editingTask) return null;

  const toggleTag = (tag: string) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 8 ? prev : [...prev, tag],
    );

  const addCustomTag = () => {
    const clean = customTag.trim().slice(0, 24);
    if (!clean) return;
    setTags((prev) => (prev.includes(clean) || prev.length >= 8 ? prev : [...prev, clean]));
    setCustomTag("");
  };

  const submit = async () => {
    if (!title.trim() || !phaseId || busy) return;
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        phaseId,
        assignedTo,
        priority,
        dueDate: dueDate || null,
        tags,
      };
      if (state.mode === "create") {
        const created = await addTask(payload);
        if (created) onClose();
      } else {
        await updateTask(editingTask!.id, payload);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
        <DialogContent fullScreenMobile className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <div>
              <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em]">
                {state.mode === "create" ? "New task" : "Edit task"}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                {state.mode === "create"
                  ? "Add a task to a phase of the sprint."
                  : editingTask!.completed
                    ? "This task is completed."
                    : "Update the task details."}
              </DialogDescription>
            </div>
            {state.mode === "edit" && (
              <div className="flex items-center gap-2 pr-8">
                {editingTask!.completed && <Badge variant="success">Completed</Badge>}
                <Button
                  variant="destructive"
                  size="iconSm"
                  aria-label="Delete task"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 />
                </Button>
              </div>
            )}
          </div>

          <form
            className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div>
              <FieldLabel htmlFor="task-title">Title</FieldLabel>
              <Input
                id="task-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Define prompting strategy"
                maxLength={200}
              />
            </div>

            <div>
              <FieldLabel htmlFor="task-desc">Description</FieldLabel>
              <Textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details, links, or acceptance criteria…"
                maxLength={2000}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="task-phase">Phase</FieldLabel>
                <Select
                  id="task-phase"
                  value={phaseId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPhaseId(next);
                    const ph = phases.find((p) => p.id === next);
                    if (ph && state.mode === "create") setDueDate(ph.endDate);
                  }}
                >
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      Phase {p.phaseNumber} — {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="task-assignee">Assigned to</FieldLabel>
                <Select
                  id="task-assignee"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="everyone">Everyone</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Priority</FieldLabel>
                <div className="flex gap-1.5">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        "h-8 flex-1 cursor-pointer rounded-lg border border-border-strong text-xs font-medium capitalize transition-all",
                        priority === p
                          ? PRIORITY_STYLES[p].active
                          : "text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                      )}
                    >
                      {PRIORITY_STYLES[p].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="task-due">Due date</FieldLabel>
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                {phase && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Phase {phase.phaseNumber} ends {phase.endDate}
                  </p>
                )}
              </div>
            </div>

            <div>
              <FieldLabel>Tags</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-all",
                        active
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border-strong text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                      )}
                    >
                      {tag}
                      {active && !DEFAULT_TAGS.includes(tag) && <X className="size-3" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-1.5">
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder="Custom tag…"
                  className="h-8 max-w-44 text-xs"
                  maxLength={24}
                />
                <Button type="button" variant="secondary" size="sm" className="h-8" onClick={addCustomTag}>
                  <Plus className="size-3.5" /> Add
                </Button>
              </div>
            </div>
          </form>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={!title.trim() || !phaseId || busy}>
              {state.mode === "create" ? "Create task" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this task?"
        description={`“${editingTask?.title ?? ""}” will be permanently removed. This can't be undone.`}
        onConfirm={() => {
          if (editingTask) {
            void removeTask(editingTask.id);
            onClose();
          }
        }}
      />
    </>
  );
}

import { z } from "zod";

export const WORKSPACE_ID_RE = /^[a-z0-9][a-z0-9-]{7,31}$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  phaseId: z.string().uuid("Invalid phase"),
  assignedTo: z.string().trim().min(1).max(64).optional().default("everyone"),
  priority: z.enum(["critical", "high", "medium", "low"]).optional().default("medium"),
  dueDate: z
    .string()
    .regex(DATE_RE, "Invalid date")
    .nullish(),
  tags: z
    .array(z.string().trim().min(1).max(24))
    .max(8)
    .optional()
    .default([]),
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  phaseId: z.string().uuid().optional(),
  assignedTo: z.string().trim().min(1).max(64).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  dueDate: z.string().regex(DATE_RE).nullish(),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
  completed: z.boolean().optional(),
});

export const memberUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
});

/** Extracts a workspace id from a raw id or a pasted link. */
export function extractWorkspaceId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (WORKSPACE_ID_RE.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/w\/([a-z0-9][a-z0-9-]{7,31})/);
    return match ? match[1] : null;
  } catch {
    const match = trimmed.match(/\/w\/([a-z0-9][a-z0-9-]{7,31})/);
    return match ? match[1] : null;
  }
}

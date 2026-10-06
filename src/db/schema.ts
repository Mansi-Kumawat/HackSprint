import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const priorityEnum = pgEnum("priority", ["critical", "high", "medium", "low"]);

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(), // hard-to-guess random slug
  name: text("name").notNull().default("HackSprint Workspace"),
  hackathonName: text("hackathon_name").notNull().default("AI Hackathon Sprint"),
  deadline: date("deadline").notNull().default("2026-10-30"),
  themeDefault: text("theme_default").notNull().default("light"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    avatar: text("avatar").notNull().default("v1"),
  },
  (t) => [index("team_members_workspace_idx").on(t.workspaceId)],
);

export const phases = pgTable(
  "phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    phaseNumber: integer("phase_number").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
  },
  (t) => [index("phases_workspace_idx").on(t.workspaceId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => phases.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    assignedTo: text("assigned_to").notNull().default("everyone"), // member id or "everyone"
    priority: priorityEnum("priority").notNull().default("medium"),
    dueDate: date("due_date"),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tasks_workspace_idx").on(t.workspaceId),
    index("tasks_phase_idx").on(t.phaseId),
    index("tasks_due_date_idx").on(t.dueDate),
  ],
);

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    action: text("action").notNull(), // created | updated | completed | reopened | deleted
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_workspace_idx").on(t.workspaceId)],
);

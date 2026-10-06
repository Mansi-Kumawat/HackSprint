export type Priority = "critical" | "high" | "medium" | "low";

export interface Workspace {
  id: string;
  name: string;
  hackathonName: string;
  deadline: string; // YYYY-MM-DD
  themeDefault: string;
  createdAt: string;
}

export interface Member {
  id: string;
  workspaceId: string;
  name: string;
  avatar: string;
}

export interface Phase {
  id: string;
  workspaceId: string;
  phaseNumber: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

export interface Task {
  id: string;
  workspaceId: string;
  phaseId: string;
  title: string;
  description: string;
  assignedTo: string; // member id or "everyone"
  priority: Priority;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  workspaceId: string;
  taskId: string | null;
  action: string;
  createdAt: string;
}

export interface WorkspaceBundle {
  workspace: Workspace;
  members: Member[];
  phases: Phase[];
  tasks: Task[];
  activity: ActivityItem[];
}

export interface TaskInput {
  title: string;
  description?: string;
  phaseId: string;
  assignedTo?: string;
  priority?: Priority;
  dueDate?: string | null;
  tags?: string[];
}

export const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

export const DEFAULT_TAGS = [
  "AI",
  "Frontend",
  "Backend",
  "Research",
  "Pitch",
  "Documentation",
  "Testing",
  "Business",
];

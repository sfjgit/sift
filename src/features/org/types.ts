// File: types.ts
// Path: src/features/org/types.ts

/** one person in the reporting tree (GET /users/org-tree, and the AI's org chart) */
export interface OrgNode {
  id: string;
  firstName: string;
  lastName: string | null;
  isActive: boolean;
  role: { name: string };
  department: { name: string } | null;
  designation: string | null;
  reportingToId: string | null;
  teamLeadId: string | null;
  stats: { clients: number; spocs: number; openTasks: number; overdue: number };
  /** everyone below, all levels */
  teamSize: number;
  children: OrgNode[];
  /** the made-up top when there are several heads */
  virtual?: boolean;
}

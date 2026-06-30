// ─────────────────────────────────────────────
// User & Auth Roles
// ─────────────────────────────────────────────
export type UserRole = 'SuperAdmin' | 'Admin' | 'Assignee';
export type FeedbackSource = 'PulseCheck' | 'ExitInterview' | 'VoiceBox' | 'Other' | 'Individual';
export type FeedbackStatus = 'Open' | 'InProgress' | 'Acknowledged' | 'Resolved' | 'Closed' | 'CWC' | 'Overdue';
export type Priority = 'High' | 'Medium' | 'Low';
export type Nature = 'Suggestion' | 'Query' | 'Positive' | 'Negative/Grievance';
export type FlagType = 'LateInput' | 'UrgentAttention' | 'Critical';

/**
 * FIXED: Added the missing User interface
 * This resolves the "Module has no exported member 'User'" error.
 */
export interface User {
  id: number;
  email: string;
  role: UserRole;
  name?: string;
  isActive: boolean;
  employeeId?: number;
  employee?: Employee;
}

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────
export interface DashboardSummary {
  total: number;
  resolved: number;
  late: number;
  new: number;
  urgent: number;
  totalOpen?: number;
  trends?: Record<string, number>;
}

export interface ChildTicket {
  id: number;
  feedbackId: string;
  category: string;
  priority: Priority;
  status: string;
  statusDisplay: string;
  agingDays: number;
  assignee: string | null;
  flag: FlagType | null;
  notes: string | null;
  createdAt: string;
}

export interface EmployeeRow {
  parentId: number;
  employee: {
    id: number;
    name: string;
    code: string;
    department: string | null;
    email: string;
  };
  feedbackSource: FeedbackSource;
  totalFeedback: number;
  actionPending: number;
  highPriorityPending: number;
  oldestPendingDays: number;
  lastFeedbackDate: string | null;
  children: ChildTicket[];
}

export interface EmployeePageResult {
  data: EmployeeRow[];
  pagination: PaginationMeta;
}

// ─────────────────────────────────────────────
// Feedback
// ─────────────────────────────────────────────
export interface FeedbackTicket {
  id: number;
  feedbackId: string;
  assignmentNumber: number;
  feedbackSource: FeedbackSource;
  category: string;
  status: FeedbackStatus;
  statusDisplay: string;
  priority: Priority;
  nature: Nature | null;
  assigneeId: number | null;
  assigneeName: string | null;
  flag: FlagType | null;
  isAnonymous: boolean;
  feedbackRegistrationDate: string | null;
  notes: string | null;
  createdAt: string;
  resolvedOn: string | null;
  firstResponseAt: string | null;
  employee: {
    fullName: string | null;
    email: string | null;
    code: string | null;
    joiningDate: string | null;
    designation: string | null;
    department: string | null;
  };
  activities?: ActivityLog[];
}

export interface ActivityLog {
  id: number;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
  performer: { employee: { fullName: string } };
}

// ─────────────────────────────────────────────
// Employees & Users
// ─────────────────────────────────────────────
export interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  department: string | null;
  designation: string | null;
  joiningDate: string | null;
  division?: string | null;
}

export interface Assignee {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  employee?: {
    fullName: string;
  };
}

// NEW: User management record
export interface UserRecord {
  id: number;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: number;
    fullName: string;
    employeeCode: string;
    department?: string;
    designation?: string;
    joiningDate?: string;
  };
}

// ─────────────────────────────────────────────
// Insights
// ─────────────────────────────────────────────
export interface AiInsight {
  id: number;
  generatedAt: string;
  insightType: 'summary' | 'trend' | 'anomaly';
  insightText: string;
  metadata: Record<string, unknown> | null;
}

// ─────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardFilters {
  tab: 'PulseCheck' | 'ExitInterview' | 'VoiceBox' | 'Others' | 'Individual';
  dateFrom?: string;
  dateTo?: string;
  status?: string | string[];
  priority?: string | string[];
  nature?: string | string[];
  assigneeId?: number | string;
}
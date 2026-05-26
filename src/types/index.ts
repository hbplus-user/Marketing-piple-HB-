export type Pipeline = 'PM' | 'Content' | 'Art / Design' | 'Events';

export type Status = 'To Do' | 'In Progress' | 'In Review' | 'Partially Approved' | 'Done';

export type Role = 'employee' | 'manager' | 'founder';

export type UrgencyLevel = 'on-track' | 'due-soon' | 'urgent' | 'overdue';

export interface User {
  id: string;
  name: string;
  initials: string;
  role: Role;
  avatarColor: string;
}

export interface ReviewRound {
  round: number;
  comments: {
    userId: string;
    text: string;
    createdAt: Date;
    referenceLink?: string;
  }[];
  status: 'pending' | 'approved' | 'changes-requested';
}

export interface ContentRequest {
  id: string;
  title: string;
  brief: string;
  pipeline: Pipeline;
  status: Status;
  requesterId: string;
  ownerId: string;                        // sole approver (unless manager overrides)
  assigneeId: string | null;
  reviewerIds: string[];
  postDate: Date;
  internalDeadline: Date;
  daysNeeded: number;
  rounds: ReviewRound[];
  currentRound: number;
  attachments: string[];
  referenceLinks: string[];
  approvedAt: Date | null;
  approvedBy: string[];
  createdAt: Date;
  postDateHistory: { date: Date; reason: string; changedBy: string }[];
  creatorRemovedFromApproval: boolean;    // owner can remove creator from sign-off chain
}

export type View = 'kanban' | 'calendar' | 'gantt' | 'redalert' | 'mytasks';

export interface BackupSnapshot {
  id: string;
  label: string;
  createdAt: string;     // ISO string
  createdBy: string | null;  // Supabase user UUID
  requestCount: number;
  data: string;          // gzip-compressed base64 JSON of all requests
}

export type ModalType =
  | 'new-request'
  | 'approval-queue'
  | 'designer-task'
  | 'review-feedback'
  | 'final-approval'
  | 'edit-post-date'
  | 'backup-restore';

export interface ModalState {
  type: ModalType;
  requestId?: string;
}

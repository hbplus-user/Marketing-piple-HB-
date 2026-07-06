export type Pipeline = 'PM' | 'Organic' | 'Internal requirement' | 'Events';

export type Status = 'Brief Approval' | 'Design' | 'Design Progress' | 'Design Review' | 'Approved' | 'Posted';

export type ActivityLogType =
  | 'brief_approved'
  | 'submitted_for_review'
  | 'partial_approval'
  | 'final_approval'
  | 'changes_requested'
  | 'marked_posted'
  | 'status_change';

export interface ActivityLogEntry {
  id: string;
  type: ActivityLogType;
  userId: string;
  timestamp: Date;
  fromStatus: Status;
  toStatus: Status;
  note?: string;
}

export type Priority = 'high' | 'medium' | 'low';

export type Role = 'employee' | 'manager' | 'founder' | 'designer';

export type UrgencyLevel = 'on-track' | 'due-soon' | 'urgent' | 'overdue';

export interface User {
  id: string;
  name: string;
  initials: string;
  role: Role;
  avatarColor: string;
  email?: string;
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
  submissionLinks: string[];
  submissionNote: string;
}

export interface AssigneeAcceptance {
  userId: string;
  acceptedAt: Date;
  startDate?: Date;
  sequence: number;
}

export interface ContentRequest {
  id: string;
  title: string;
  brief: string;
  pipeline: Pipeline;
  status: Status;
  requesterId: string;
  ownerId: string;                        // sole approver (unless manager overrides)
  assigneeIds: string[];
  followerIds: string[];
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
  managerApproved?: boolean;
  founderApprovalRequired?: boolean;
  founderApproved?: boolean;
  activityLog: ActivityLogEntry[];
  postedBy: string[];                     // both owner + a manager must mark posted
  assigneeAcceptance: AssigneeAcceptance[];
  priority?: Priority;
  initiatedAt?: Date | null;
  category?: string | null;
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
  | 'backup-restore'
  | 'edit-task'
  | 'manage-team';

export interface ModalState {
  type: ModalType;
  requestId?: string;
}

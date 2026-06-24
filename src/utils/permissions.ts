import type { ContentRequest, Role } from '../types';

/**
 * Manager → full approval (Done).
 * Founder → partial approval.
 * Employee who created (requesterId) OR is owner → partial approval.
 * Other employees → cannot approve.
 */
export function canApprove(role: Role, req: ContentRequest, userId: string): boolean {
  if (role === 'manager') return true;
  if (role === 'founder') return true;
  return req.ownerId === userId || req.requesterId === userId;
}

/** Returns true when the approval is full (manager), false when partial. */
export function isFullApproval(role: Role): boolean {
  return role === 'manager';
}

/** Manager can override any approval regardless of ownership. */
export function canOverride(role: Role): boolean {
  return role === 'manager';
}

/** Founder + manager + task owner + creator can request changes. */
export function canRequestChanges(role: Role, req: ContentRequest, userId: string): boolean {
  if (role === 'manager' || role === 'founder') return true;
  return req.ownerId === userId || req.requesterId === userId || req.reviewerIds.includes(userId);
}

/** Manager and founder see the approval queue. */
export function canAccessApprovalQueue(role: Role): boolean {
  return role === 'manager' || role === 'founder';
}

/** Requester, manager, and founder can edit post dates/tasks. */
export function canEditPostDate(role: Role, req: ContentRequest, userId: string): boolean {
  return role === 'manager' || role === 'founder' || req.requesterId === userId;
}

/** Manager or task owner can remove creator from approval chain. */
export function canRemoveCreator(role: Role, req: ContentRequest, userId: string): boolean {
  return role === 'manager' || req.ownerId === userId;
}

/** All team members can see all tasks. */
export function canViewAllRequests(_role: Role): boolean {
  return true;
}

/** Only the task creator (requesterId) or a manager can edit a task. */
export function canEdit(role: Role, req: ContentRequest, userId: string): boolean {
  return role === 'manager' || req.requesterId === userId;
}

/** Returns true if the task is approved (or doesn't require further manager/founder approval). */
export function isTaskApproved(req: ContentRequest): boolean {
  // If status is already past 'Brief Approval', it's considered approved
  if (req.status !== 'Brief Approval') return true;

  // Check new fields if they exist
  if (req.managerApproved !== undefined) {
    if (!req.managerApproved) return false;
    if (req.founderApprovalRequired && !req.founderApproved) return false;
    return true;
  }

  // Backwards compatibility for existing tasks
  return true;
}

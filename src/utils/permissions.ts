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

/** Only manager sees the approval queue. */
export function canAccessApprovalQueue(role: Role): boolean {
  return role === 'manager';
}

/** Only manager can edit post dates. */
export function canEditPostDate(role: Role): boolean {
  return role === 'manager';
}

/** Manager or task owner can remove creator from approval chain. */
export function canRemoveCreator(role: Role, req: ContentRequest, userId: string): boolean {
  return role === 'manager' || req.ownerId === userId;
}

/** Employees only see their own requests; manager/founder see all. */
export function canViewAllRequests(role: Role): boolean {
  return role === 'manager' || role === 'founder';
}

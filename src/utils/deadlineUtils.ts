import { differenceInDays, subDays } from 'date-fns';
import type { ContentRequest, UrgencyLevel } from '../types';

export function calcInternalDeadline(postDate: Date): Date {
  return subDays(postDate, 5);
}

export function daysToDeadline(internalDeadline: Date): number {
  return differenceInDays(internalDeadline, new Date());
}

export function isRedAlert(req: ContentRequest): boolean {
  if (req.status === 'Done') return false;
  return daysToDeadline(req.internalDeadline) < req.daysNeeded;
}

export function getUrgency(req: ContentRequest): UrgencyLevel {
  if (req.status === 'Done') return 'on-track';
  const days = daysToDeadline(req.internalDeadline);
  if (days < 0) return 'overdue';
  if (days < req.daysNeeded) return 'urgent';
  if (days <= req.daysNeeded + 2) return 'due-soon';
  return 'on-track';
}

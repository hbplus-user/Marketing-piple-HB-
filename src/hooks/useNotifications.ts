import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { playNotificationSound, unlockAudio } from '../utils/notificationSound';
import { daysToDeadline } from '../utils/deadlineUtils';
import type { ContentRequest, ActivityLogType } from '../types';

export interface NotificationItem {
  id: string;
  requestId: string;
  requestTitle: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface ToastItem {
  id: string;
  message: string;
  timestamp: Date;
  requestId: string;
}

const LOG_MESSAGES: Partial<Record<ActivityLogType, string>> = {
  submitted_for_review: 'submitted this for design review',
  partial_approval:     'partially approved this request',
  final_approval:       'gave final approval',
  changes_requested:    'requested changes',
  marked_posted:        'marked this as posted',
  brief_approved:       'approved the brief',
};

function isStakeholder(req: ContentRequest, userId: string): boolean {
  return req.requesterId === userId ||
    req.ownerId === userId ||
    req.assigneeIds.includes(userId) ||
    req.reviewerIds.includes(userId);
}

export function useNotifications() {
  const { requests, users, currentUser } = useApp();

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const raw = localStorage.getItem(`pipeline_notifications_read_${currentUser.id}`);
    return raw ? new Set(JSON.parse(raw)) : new Set<string>();
  });

  const notifications = useMemo<NotificationItem[]>(() => {
    const out: NotificationItem[] = [];

    for (const req of requests) {
      if (!isStakeholder(req, currentUser.id)) continue;

      // A brand-new request — alert everyone on it.
      const creator = users.find(u => u.id === req.requesterId);
      const creatorName = creator?.id === currentUser.id ? 'You' : (creator?.name ?? 'Someone');
      const createdId = `created-${req.id}`;
      out.push({
        id: createdId,
        requestId: req.id,
        requestTitle: req.title,
        message: `${creatorName} created ${req.title}`,
        timestamp: req.createdAt,
        read: readIds.has(createdId),
      });

      // Deadline creeping up (or already past) and still unresolved — resurface
      // once per calendar day for as long as that stays true.
      if (req.status !== 'Approved' && req.status !== 'Posted') {
        const days = daysToDeadline(req.internalDeadline);
        if (days <= 2) {
          const now = new Date();
          // Anchor to the start of today (not "now") so it reads as seen for the
          // rest of the day once viewed, instead of flipping unread every render.
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const dayKey = startOfToday.toISOString().slice(0, 10);
          const dueId = `duedate-${req.id}-${dayKey}`;
          out.push({
            id: dueId,
            requestId: req.id,
            requestTitle: req.title,
            message: days < 0
              ? `${req.title} is overdue by ${Math.abs(days)}d`
              : days === 0
                ? `${req.title} is due today`
                : `${req.title} is due in ${days}d`,
            timestamp: startOfToday,
            read: readIds.has(dueId),
          });
        }
      }

      for (const entry of (req.activityLog ?? [])) {
        // Any real stage move (not e.g. an assign/unassign, which logs the same
        // status_change type with fromStatus === toStatus) gets its own alert.
        const label = entry.type === 'status_change' && entry.fromStatus !== entry.toStatus
          ? `moved this to ${entry.toStatus}`
          : LOG_MESSAGES[entry.type];
        if (!label) continue;
        const actor = users.find(u => u.id === entry.userId);
        const actorName = actor?.id === currentUser.id ? 'You' : (actor?.name ?? 'Someone');
        out.push({
          id: entry.id,
          requestId: req.id,
          requestTitle: req.title,
          message: `${actorName} ${label} — ${req.title}`,
          timestamp: entry.timestamp,
          read: readIds.has(entry.id),
        });
      }

      for (const round of req.rounds) {
        for (const c of round.comments) {
          const actor = users.find(u => u.id === c.userId);
          const actorName = actor?.id === currentUser.id ? 'You' : (actor?.name ?? 'Someone');
          const commentId = `comment-${req.id}-${round.round}-${c.createdAt.getTime()}-${c.userId}`;
          out.push({
            id: commentId,
            requestId: req.id,
            requestTitle: req.title,
            message: `${actorName} commented on ${req.title}`,
            timestamp: c.createdAt,
            read: readIds.has(commentId),
          });
        }
      }
    }

    return out.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 30);
  }, [requests, users, currentUser.id, readIds]);

  // Initialize readIds on first load of non-empty notifications if localStorage is not set
  useEffect(() => {
    const key = `pipeline_notifications_read_${currentUser.id}`;
    const raw = localStorage.getItem(key);
    if (!raw && notifications.length > 0) {
      const ids = notifications.map(n => n.id);
      localStorage.setItem(key, JSON.stringify(ids));
      setReadIds(new Set(ids));
    }
  }, [notifications, currentUser.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    const ids = notifications.map(n => n.id);
    setReadIds(prev => {
      const next = new Set([...prev, ...ids]);
      const array = Array.from(next).slice(-200);
      localStorage.setItem(`pipeline_notifications_read_${currentUser.id}`, JSON.stringify(array));
      return new Set(array);
    });
  }, [notifications, currentUser.id]);

  // Tracked as state (not just `Notification.permission`) so the UI can react
  // to it — e.g. show an "Enable alerts" button until this is 'granted'.
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );

  // Must run inside a real user gesture (click/keydown) or the browser silently
  // ignores it. Exposed so TopBar can call it directly from the bell's onClick,
  // in addition to the passive first-interaction listener below.
  const requestPermission = useCallback(() => {
    unlockAudio();
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') {
      setPermission(Notification.permission);
      return;
    }
    Notification.requestPermission().then(result => setPermission(result));
  }, []);

  // Browsers require an actual user gesture before they'll show the permission
  // prompt or let audio play — piggyback on the very first click/keypress anywhere.
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    const unlock = () => {
      requestPermission();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [requestPermission]);

  // Play a sound + fire a real OS notification for whatever's newly unread —
  // never for the backlog already sitting there on first load.
  const knownUnreadIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const currentUnreadIds = new Set(notifications.filter(n => !n.read).map(n => n.id));

    if (knownUnreadIdsRef.current === null) {
      knownUnreadIdsRef.current = currentUnreadIds;
      return;
    }

    const freshOnes = notifications.filter(n => !n.read && !knownUnreadIdsRef.current!.has(n.id));
    if (freshOnes.length > 0) {
      playNotificationSound();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const latest = freshOnes[0];
        new Notification('Marketing Prod Dashboard', { body: latest.message });
      }
    }
    knownUnreadIdsRef.current = currentUnreadIds;
  }, [notifications]);

  return { notifications, unreadCount, markAllRead, permission, requestPermission };
}

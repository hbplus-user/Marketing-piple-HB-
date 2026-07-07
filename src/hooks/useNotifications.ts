import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { playNotificationSound, unlockAudio } from '../utils/notificationSound';
import type { ContentRequest, ActivityLogType } from '../types';

export interface NotificationItem {
  id: string;
  requestId: string;
  requestTitle: string;
  message: string;
  timestamp: Date;
  read: boolean;
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

function lastSeenKey(userId: string) {
  return `pipeline_notifications_last_seen_${userId}`;
}

export function useNotifications() {
  const { requests, users, currentUser } = useApp();

  // Bumped after markAllRead to force lastSeen to re-read from localStorage
  const [seenVersion, setSeenVersion] = useState(0);

  const lastSeen = useMemo(() => {
    const raw = localStorage.getItem(lastSeenKey(currentUser.id));
    return raw ? parseInt(raw, 10) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, seenVersion]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const out: NotificationItem[] = [];

    for (const req of requests) {
      if (!isStakeholder(req, currentUser.id)) continue;

      for (const entry of (req.activityLog ?? [])) {
        if (entry.userId === currentUser.id) continue;
        // Any real stage move (not e.g. an assign/unassign, which logs the same
        // status_change type with fromStatus === toStatus) gets its own alert.
        const label = entry.type === 'status_change' && entry.fromStatus !== entry.toStatus
          ? `moved this to ${entry.toStatus}`
          : LOG_MESSAGES[entry.type];
        if (!label) continue;
        const actor = users.find(u => u.id === entry.userId);
        out.push({
          id: entry.id,
          requestId: req.id,
          requestTitle: req.title,
          message: `${actor?.name ?? 'Someone'} ${label} — ${req.title}`,
          timestamp: entry.timestamp,
          read: entry.timestamp.getTime() <= lastSeen,
        });
      }

      for (const round of req.rounds) {
        for (const c of round.comments) {
          if (c.userId === currentUser.id) continue;
          const actor = users.find(u => u.id === c.userId);
          out.push({
            id: `comment-${req.id}-${round.round}-${c.createdAt.getTime()}-${c.userId}`,
            requestId: req.id,
            requestTitle: req.title,
            message: `${actor?.name ?? 'Someone'} commented on ${req.title}`,
            timestamp: c.createdAt,
            read: c.createdAt.getTime() <= lastSeen,
          });
        }
      }
    }

    return out.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 30);
  }, [requests, users, currentUser.id, lastSeen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    localStorage.setItem(lastSeenKey(currentUser.id), String(Date.now()));
    setSeenVersion(v => v + 1);
  }, [currentUser.id]);

  // Browsers require an actual user gesture before they'll show the permission
  // prompt or let audio play — piggyback on the very first click/keypress anywhere.
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    const unlock = () => {
      Notification.requestPermission();
      unlockAudio();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

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
        new Notification('Marketing Pipeline', { body: latest.message });
      }
    }
    knownUnreadIdsRef.current = currentUnreadIds;
  }, [notifications]);

  return { notifications, unreadCount, markAllRead };
}

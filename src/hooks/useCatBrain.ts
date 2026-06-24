import { useState, useEffect, useRef, useCallback } from 'react';
import type { ContentRequest } from '../types';

export interface CatMessage {
  text: string;
  yesLabel?: string;
  nopeLabel?: string;
  onYes?: () => void;
}

export interface CatBrainInput {
  requests?: ContentRequest[];
  setActiveView?: (v: string) => void;
}

const COOLDOWN_MS = 40_000; // 40s between unsolicited messages

// Messages keyed by column name
const COLUMN_LINES: Record<string, string> = {
  'Brief Approval':  'New briefs waiting — exciting stuff incoming! 📋',
  'Design':          'Design phase! Let the creativity flow 🎨',
  'Design Progress': 'Work in progress… looking good so far! 🐾',
  'Design Review':   'Review time — careful eyes needed here 👀',
  'Approved':        'Almost at the finish line! Just needs posting ✨',
  'Posted':          'These are done and live! Great work 🎉',
};

const IDLE_LINES: CatMessage[] = [
  { text: 'Need help with anything? 😺' },
  { text: "Still here! Let me know if you need anything 🐾" },
  { text: "Psst… don't forget to check your deadlines! 📅" },
  { text: "I'm watching over the board for you 🐱" },
];

export function useCatBrain({ requests = [], setActiveView }: CatBrainInput = {}) {
  const [message, setMessage] = useState<CatMessage | null>(null);
  const cooldownRef   = useRef<number>(0);
  const mountedRef    = useRef(false);
  const idleLineIdx   = useRef(0);

  // ── Internal helpers ──────────────────────────────────────────────────────
  const tryShow = useCallback((msg: CatMessage) => {
    const now = Date.now();
    if (now - cooldownRef.current < COOLDOWN_MS) return;
    cooldownRef.current = now;
    setMessage(msg);
  }, []);

  const dismiss = useCallback(() => setMessage(null), []);

  /** Force-show a message, bypassing cooldown (for manual triggers). */
  const sendMessage = useCallback((msg: CatMessage) => {
    cooldownRef.current = Date.now();
    setMessage(msg);
  }, []);

  // ── Column-hover messages ─────────────────────────────────────────────────
  const notifyColumnHover = useCallback((column: string) => {
    const line = COLUMN_LINES[column];
    if (line) tryShow({ text: line });
  }, [tryShow]);

  // ── Drag messages ─────────────────────────────────────────────────────────
  const notifyDragStart = useCallback(() => {
    sendMessage({ text: "Where are we taking this one? 🐾" });
  }, [sendMessage]);

  // ── Overdue check (fires once, 6s after mount) ────────────────────────────
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    if (!requests.length) return;

    const t = setTimeout(() => {
      const now = new Date();
      const overdue = requests.filter(r =>
        new Date(r.internalDeadline) < now &&
        r.status !== 'Posted' &&
        r.status !== 'Approved'
      );
      if (overdue.length === 0) return;
      tryShow({
        text: overdue.length === 1
          ? 'One task has passed its deadline 🐾'
          : `${overdue.length} tasks have passed their deadlines! 🐾`,
        yesLabel: 'Show alerts',
        nopeLabel: 'Later',
        onYes: () => setActiveView?.('redalert'),
      });
    }, 6000);

    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Idle prompt (called by cat when it's been idle >30s) ──────────────────
  const notifyIdle = useCallback(() => {
    const msg = IDLE_LINES[idleLineIdx.current % IDLE_LINES.length];
    idleLineIdx.current += 1;
    tryShow(msg);
  }, [tryShow]);

  return { message, dismiss, sendMessage, notifyColumnHover, notifyDragStart, notifyIdle };
}

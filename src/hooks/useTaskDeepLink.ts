import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

/** `?task=REQ-083` — the query parameter Slack links point at. */
export const TASK_PARAM = 'task';

/** Reads the deep-linked task id from the current URL, if there is one. */
export function readTaskParam(): string | null {
  try {
    return new URLSearchParams(window.location.search).get(TASK_PARAM);
  } catch {
    return null;
  }
}

/**
 * Opens the task named in `?task=REQ-083` once requests have loaded.
 *
 * Tasks have no route of their own — modals are driven by context state — so a
 * link from Slack lands on the board and this turns the query parameter into the
 * same modal a click on the card would open. The parameter is then stripped, so
 * closing the modal and refreshing doesn't reopen it.
 */
export function useTaskDeepLink() {
  const { requests, openModal } = useApp();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const id = readTaskParam();
    if (!id) { handled.current = true; return; }

    // Requests arrive asynchronously; wait for the one we were sent to.
    const req = requests.find(r => r.id === id);
    if (!req) return;

    handled.current = true;
    // Mirror KanbanCard: Design Review opens the review view, everything else
    // the task view.
    openModal(
      req.status === 'Design Review'
        ? { type: 'review-feedback', requestId: req.id }
        : { type: 'designer-task', requestId: req.id },
    );

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete(TASK_PARAM);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Non-fatal: the modal is open either way.
    }
  }, [requests, openModal]);
}

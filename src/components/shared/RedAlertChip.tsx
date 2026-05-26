import { motion } from 'framer-motion';
import { daysToDeadline } from '../../utils/deadlineUtils';
import type { ContentRequest } from '../../types';

export default function RedAlertChip({ req }: { req: ContentRequest }) {
  const days = daysToDeadline(req.internalDeadline);
  return (
    <motion.span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-label={`Red Alert: ${days}d to deadline, needs ${req.daysNeeded}d`}
    >
      ⏰ {days < 0 ? 'Overdue' : `${days}d to deadline`} · needs {req.daysNeeded}d
    </motion.span>
  );
}

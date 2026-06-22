import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Paperclip } from 'lucide-react';
import type { ContentRequest } from '../../types';
import { isRedAlert } from '../../utils/deadlineUtils';
import { pipelineConfig } from '../shared/Badge';
import Badge from '../shared/Badge';
import StatusChip from '../shared/StatusChip';
import RedAlertChip from '../shared/RedAlertChip';
import RoundBadge from '../shared/RoundBadge';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';

export default function KanbanCard({ req }: { req: ContentRequest }) {
  const { openModal, users } = useApp();
  const alert = isRedAlert(req);
  const pipelineColor = pipelineConfig[req.pipeline]?.dot ?? '#6B7280';
  const assignees = users.filter(u => req.assigneeIds.includes(u.id));

  const handleClick = () => {
    if (req.status === 'Design Review' || req.status === 'Approved') {
      openModal({ type: 'review-feedback', requestId: req.id });
    } else {
      openModal({ type: 'designer-task', requestId: req.id });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -5,
        boxShadow: alert
          ? '0 6px 18px rgba(239,68,68,0.14), 0 18px 36px rgba(239,68,68,0.08), 0 2px 4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)'
          : '0 6px 18px rgba(15,23,42,0.11), 0 18px 36px rgba(15,23,42,0.07), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1)',
      }}
      whileTap={{ y: -1, scale: 0.99 }}
      onClick={handleClick}
      className={`bg-white rounded-xl cursor-pointer overflow-hidden ${
        alert ? 'border border-red-100' : 'border border-gray-100/60'
      }`}
      style={{
        borderTopWidth: 3,
        borderTopColor: pipelineColor,
        borderTopStyle: 'solid',
        boxShadow: alert
          ? `0 1px 3px rgba(239,68,68,0.10), 0 4px 10px rgba(239,68,68,0.06), inset 0 1px 0 rgba(255,255,255,0.95)`
          : `0 1px 3px rgba(15,23,42,0.07), 0 4px 10px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,1)`,
      }}
      role="button"
      tabIndex={0}
      aria-label={req.title}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <div className="px-3.5 pt-2.5 pb-3 space-y-2">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <Badge pipeline={req.pipeline} />
        </div>

        {/* Title */}
        <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">
          {req.title}
        </p>

        {/* Red alert */}
        {alert && <RedAlertChip req={req} />}

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {!alert && <StatusChip status={req.status} />}
            <RoundBadge round={req.currentRound} />
            {req.attachments.length > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                <Paperclip size={10} />
                {req.attachments.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-gray-400">
              {format(req.postDate, 'MMM d')}
            </span>
            <div className="flex -space-x-1">
              {assignees.slice(0, 3).map(u => (
                <Avatar key={u.id} initials={u.initials} color={u.avatarColor} size="sm" title={u.name} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

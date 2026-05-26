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
import { USERS } from '../../data/mockData';

export default function KanbanCard({ req }: { req: ContentRequest }) {
  const { openModal } = useApp();
  const alert = isRedAlert(req);
  const pipelineColor = pipelineConfig[req.pipeline]?.dot ?? '#6B7280';
  const assignee = USERS.find(u => u.id === req.assigneeId);

  const handleClick = () => {
    if (req.status === 'In Review' || req.status === 'Done') {
      openModal({ type: 'review-feedback', requestId: req.id });
    } else {
      openModal({ type: 'designer-task', requestId: req.id });
    }
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -1 }}
      onClick={handleClick}
      className={`bg-white rounded-xl border cursor-pointer overflow-hidden transition-shadow hover:shadow-md ${
        alert ? 'border-red-200' : 'border-gray-100'
      }`}
      style={{ borderTopWidth: 4, borderTopColor: pipelineColor }}
      role="button"
      tabIndex={0}
      aria-label={`${req.id}: ${req.title}`}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <div className="px-3.5 pt-2.5 pb-3 space-y-2">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-gray-400">{req.id}</span>
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
            {assignee && (
              <Avatar initials={assignee.initials} color={assignee.avatarColor} size="sm" title={assignee.name} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

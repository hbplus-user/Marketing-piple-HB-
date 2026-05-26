import type { Pipeline } from '../../types';

const pipelineConfig: Record<Pipeline, { bg: string; text: string; dot: string }> = {
  'PM': { bg: '#F5F3FF', text: '#7C3AED', dot: '#7C3AED' },
  'Content': { bg: '#F0F9FF', text: '#0EA5E9', dot: '#0EA5E9' },
  'Art / Design': { bg: '#FDF2F8', text: '#EC4899', dot: '#EC4899' },
  'Events': { bg: '#FFFBEB', text: '#F59E0B', dot: '#F59E0B' },
};

interface BadgeProps {
  pipeline: Pipeline;
  size?: 'sm' | 'md';
}

export default function Badge({ pipeline, size = 'sm' }: BadgeProps) {
  const cfg = pipelineConfig[pipeline];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {pipeline}
    </span>
  );
}

export { pipelineConfig };

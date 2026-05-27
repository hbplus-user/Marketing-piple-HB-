import type { Pipeline } from '../../types';

const pipelineConfig: Record<Pipeline, { bg: string; text: string; dot: string }> = {
  'PM':          { bg: '#e8ebf1', text: '#344161', dot: '#344161' },
  'Content':     { bg: '#edf2ef', text: '#4a6b5c', dot: '#6f8e7c' },
  'Art / Design':{ bg: '#f5ece7', text: '#a9674d', dot: '#a9674d' },
  'Events':      { bg: '#f7f1e3', text: '#9a7336', dot: '#c99d5d' },
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

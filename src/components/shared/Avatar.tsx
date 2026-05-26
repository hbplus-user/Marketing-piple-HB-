interface AvatarProps {
  initials: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

const sizes = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' };

export default function Avatar({ initials, color, size = 'md', title }: AvatarProps) {
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: color }}
      title={title}
      aria-label={title || initials}
    >
      {initials}
    </div>
  );
}

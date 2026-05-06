'use client';

import Image from 'next/image';

interface Props {
  username: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  neon?: boolean;
  avatarUrl?: string | null;
}

const sizes: Record<NonNullable<Props['size']>, { cls: string; px: number }> = {
  xs: { cls: 'w-6 h-6 text-[9px]',   px: 24 },
  sm: { cls: 'w-7 h-7 text-[10px]',  px: 28 },
  md: { cls: 'w-10 h-10 text-sm',    px: 40 },
  lg: { cls: 'w-14 h-14 text-lg',    px: 56 },
  xl: { cls: 'w-24 h-24 text-3xl',   px: 96 },
};

export function UserAvatar({ username, size = 'md', neon = true, avatarUrl }: Props) {
  const initials = username
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const { cls } = sizes[size];

  if (avatarUrl) {
    return (
      <div className={`${cls} rounded-full overflow-hidden shrink-0 relative`}>
        <Image
          src={avatarUrl}
          alt={username}
          fill
          unoptimized
          sizes={`${sizes[size].px}px`}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={neon ? { background: 'var(--neon-gradient)' } : { background: 'var(--violet)' }}
    >
      {initials}
    </div>
  );
}

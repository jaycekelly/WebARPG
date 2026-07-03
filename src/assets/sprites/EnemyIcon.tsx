import { SpriteWrapper, SPRITE_SIZE } from './SpriteWrapper';

export const EnemyIcon = ({ size = 52, className }: { size?: number; className?: string }) => (
  <SpriteWrapper size={size}>
    <svg width={SPRITE_SIZE(size)} height={SPRITE_SIZE(size)} viewBox="0 0 32 32" fill="none" className={className} style={{ filter: 'blur(0)' }}>
      <polygon points="11,2 14,9 8,9" fill="currentColor" />
      <polygon points="21,2 24,9 18,9" fill="currentColor" />
      <circle cx="16" cy="9" r="4" fill="currentColor" />
      <path d="M9,13 L7,20 L10,26 L12,27 L20,27 L22,26 L25,20 L23,13 Z" fill="currentColor" />
      <path d="M7,15 L4,13 L5,18 L7,18 Z" fill="currentColor" />
      <path d="M25,15 L28,13 L27,18 L25,18 Z" fill="currentColor" />
      <rect x="11" y="26" width="3" height="6" rx="1" fill="currentColor" />
      <rect x="18" y="26" width="3" height="6" rx="1" fill="currentColor" />
    </svg>
  </SpriteWrapper>
);

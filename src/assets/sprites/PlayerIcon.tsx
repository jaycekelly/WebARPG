import { SpriteWrapper, SPRITE_SIZE } from './SpriteWrapper';

export const PlayerIcon = ({ size = 52, className }: { size?: number; className?: string }) => (
  <SpriteWrapper size={size}>
    <svg width={SPRITE_SIZE(size)} height={SPRITE_SIZE(size)} viewBox="0 0 32 32" fill="none" className={className} style={{ filter: 'blur(0)' }}>
      <circle cx="16" cy="5" r="5" fill="currentColor" />
      <rect x="10" y="10" width="12" height="10" rx="2" fill="currentColor" />
      <rect x="6" y="11" width="4" height="8" rx="1.5" fill="currentColor" />
      <rect x="22" y="11" width="4" height="8" rx="1.5" fill="currentColor" />
      <rect x="11" y="20" width="4" height="12" rx="1.25" fill="currentColor" />
      <rect x="17" y="20" width="4" height="12" rx="1.25" fill="currentColor" />
    </svg>
  </SpriteWrapper>
);

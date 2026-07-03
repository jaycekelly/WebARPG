import { SpriteWrapper, SPRITE_SIZE } from './SpriteWrapper';

export const TreeIcon = ({ size = 52, className }: { size?: number; className?: string }) => (
  <SpriteWrapper size={size}>
    <svg width={SPRITE_SIZE(size)} height={SPRITE_SIZE(size)} viewBox="0 0 32 32" fill="none" className={className} style={{ filter: 'blur(0)' }}>
      <rect x="14" y="16" width="4" height="16" rx="1" fill="currentColor" opacity="0.7" />
      <path d="M16,3 L20,10 L18,9 L22,16 L14,16 L18,9 L16,10 L12,3 Z" fill="currentColor" opacity="0.6" />
      <circle cx="16" cy="9" r="7" fill="currentColor" opacity="0.5" />
      <circle cx="16" cy="9" r="4.5" fill="currentColor" />
    </svg>
  </SpriteWrapper>
);

import { SpriteWrapper, SPRITE_SIZE } from './SpriteWrapper';

export const SproutIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <SpriteWrapper size={size}>
    <svg width={SPRITE_SIZE(size)} height={SPRITE_SIZE(size)} viewBox="0 0 16 16" fill="none" className={className} style={{ filter: 'blur(0)' }}>
      <path d="M8,15 L8,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4,8 Q8,3 12,8" fill="currentColor" opacity="0.8" />
      <path d="M6,10 Q8,6 10,10" fill="currentColor" opacity="0.8" />
    </svg>
  </SpriteWrapper>
);

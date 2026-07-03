import { SpriteWrapper, SPRITE_SIZE } from './SpriteWrapper';

export const FlowerIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <SpriteWrapper size={size}>
    <svg width={SPRITE_SIZE(size)} height={SPRITE_SIZE(size)} viewBox="0 0 16 16" fill="none" className={className} style={{ filter: 'blur(0)' }}>
      <circle cx="8" cy="8" r="2" fill="currentColor" />
      <circle cx="8" cy="3" r="1.5" fill="currentColor" />
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" />
      <circle cx="8" cy="13" r="1.5" fill="currentColor" />
    </svg>
  </SpriteWrapper>
);

import { SpriteWrapper, SPRITE_SIZE } from './SpriteWrapper';

export const RockIcon = ({ size = 52, className }: { size?: number; className?: string }) => (
  <SpriteWrapper size={size}>
    <svg width={SPRITE_SIZE(size)} height={SPRITE_SIZE(size)} viewBox="0 0 32 32" fill="none" className={className} style={{ filter: 'blur(0)' }}>
      <path
        d="M8,32 L6,25 L5,21 L8,16 L12,12 L16,9 L20,11 L24,14 L26,19 L27,24 L25,30 L22,32 L13,32 Z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M10,30 L8,23 L10,17 L14,13 L18,11 L22,13 L25,18 L26,23 L24,29 L20,31 L12,31 Z"
        fill="currentColor"
        opacity="0.45"
      />
      <path
        d="M12,29 L11,22 L13,16 L16,13 L20,14 L23,18 L24,23 L22,28 L18,30 L14,30 Z"
        fill="currentColor"
      />
    </svg>
  </SpriteWrapper>
);

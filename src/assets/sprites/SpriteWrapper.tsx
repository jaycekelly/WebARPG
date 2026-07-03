interface SpriteWrapperProps {
  size: number;
  children: React.ReactNode;
}

const SCALE = 3;

export const SpriteWrapper = ({ size, children }: SpriteWrapperProps) => (
  <div style={{ width: size, height: size, overflow: 'hidden' }}>
    <div style={{ transform: `scale(${1 / SCALE})`, transformOrigin: '0 0' }}>
      {children}
    </div>
  </div>
);

export const SPRITE_SIZE = (size: number) => size * SCALE;

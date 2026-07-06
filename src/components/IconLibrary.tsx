import { 
  Sword, Shield, HelpCircle, Hexagon, ShieldAlert,
  Zap, Activity, Heart, Wrench, ShieldOff, Plus, ArrowUp, 
  Lock, ArrowUpCircle, FlaskConical, Droplet,
  Crown, CircleSmall, Diamond
} from 'lucide-react';

import { 
  IconFlask, 
  IconFlask2, 
  IconBottle,
  IconDroplet,
  IconSkull,
  IconSwords,
  IconBow,
  IconAxe,
  IconBook,
  IconWand,
  IconFlame
} from '@tabler/icons-react';

import { ICON_PATHS } from '../renderer/assets';

const GameIcon = (name: string) => (props: any) => {
  const def = ICON_PATHS[name];
  if (!def) return <HelpCircle {...props} />;
  
  const isArray = Array.isArray(def);
  const paths = isArray ? def : def.paths;
  const scale = isArray ? 1 : (def.scale || 1);
  const transform = scale !== 1 ? `translate(12 12) scale(${scale}) translate(-12 -12)` : undefined;

  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform={transform}>
        {paths.map((p: string, i: number) => <path key={i} d={p} />)}
      </g>
    </svg>
  );
};


export const ICONS: Record<string, React.ElementType> = {
  // Lucide
  Sword, 
  Shield, 
  HelpCircle, 
  Hexagon, 
  ShieldAlert, 
  Zap,
  Activity,
  Heart,
  Wrench,
  ShieldOff,
  Plus,
  ArrowUp,
  Lock,
  ArrowUpCircle,
  FlaskConical,
  Droplet,
  Crown,

  // Equipment overrides
  chest_armor: GameIcon('chest_armor'),
  helmet: GameIcon('helmet'),
  amulet: GameIcon('amulet'),
  gloves: GameIcon('gloves'),
  boots: GameIcon('boots'),
  ring: GameIcon('ring'),
  leg_armor: GameIcon('leg_armor'),
  staff: GameIcon('staff'),
  
  Gem: Diamond,
  Disc: CircleSmall,
  Book: IconBook,
  Wand: IconWand,
  Flame: IconFlame,
  Crosshair: IconBow,

  // Tabler
  Flask: IconFlask,
  Flask2: IconFlask2,
  Bottle: IconBottle,
  TablerDroplet: IconDroplet,
  Skull: IconSkull,
  Swords: IconSwords,
  Bow: IconBow,
  Axe: IconAxe,
};

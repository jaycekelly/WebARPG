import { 
  Sword, Shield, HelpCircle, Hexagon, ShieldAlert,
  Zap, Activity, Heart, Wrench, ShieldOff, Plus, ArrowUp, 
  Lock, ArrowUpCircle, FlaskConical, Droplet,
  Crown, CircleSmall, Diamond, CandyCane, Sparkles,
  Mountain, Rocket
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

export const GameIcon = (name: string) => (props: any) => {
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
      width={props.size || "24"}
      height={props.size || "24"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform={transform}>
        {paths.map((p: any, i: number) => <path key={i} d={typeof p === 'string' ? p : p.d} fill={p.fill ? "currentColor" : "none"} />)}
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
  Sparkles,
  Mountain,
  Rocket,

  // Equipment overrides
  chest_armor: GameIcon('chest_armor'),
  helmet: GameIcon('helmet'),
  amulet: GameIcon('amulet'),
  gloves: GameIcon('gloves'),
  boots: GameIcon('boots'),
  ring: GameIcon('ring'),
  leg_armor: GameIcon('leg_armor'),
  staff: CandyCane,

  // Fighter combo hit icons (hand-drawn paths in assets.ts ICON_PATHS, reused here via
  // GameIcon() so the hotbar icon matches the same shape used by the floating combat
  // text/entity Pixi renderer instead of falling back to Flame).
  Scissors: GameIcon('Scissors'),
  Hammer: GameIcon('Hammer'),
  
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

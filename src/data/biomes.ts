export interface BiomeTheme {
  id: string;
  name: string;
  floorColor: number;
  voidColor: number;
  entityAmbient: { r: number; g: number; b: number };
  wallColor?: number;
  wallGlowColor?: number;
  wallLineColor?: number;
}

export const BIOME_THEMES: Record<string, BiomeTheme> = {
  town: {
    id: 'town',
    name: 'Town',
    floorColor: 0x275932, // Vibrant forest green
    voidColor: 0x080f0a,  // Calibrated green backdrop to avoid pitch blackness under high contrast
    entityAmbient: { r: 25, g: 55, b: 60 }, // Richer morning shadows
    wallColor: 0x163f25,  // Deep forest green walls
    wallGlowColor: 0x22c55e, // Vibrant green glow
    wallLineColor: 0x4ade80, // Light green accents
  },
  dungeon_slate: {
    id: 'dungeon_slate',
    name: 'Slate Cave',
    floorColor: 0x282828,
    voidColor: 0x08080a,  // Calibrated neutral slate backdrop
    entityAmbient: { r: 24, g: 24, b: 24 }, // Readable slate shadows
    wallColor: 0x3f3f46,  // Cool dark grey walls
    wallGlowColor: 0x71717a, // Neutral grey glow
    wallLineColor: 0xa1a1aa, // Light grey accents
  },
  dungeon_navy: {
    id: 'dungeon_navy',
    name: 'Deep Navy Cave',
    floorColor: 0x1F2433,
    voidColor: 0x050711,  // Calibrated deep navy backdrop (dimmed to avoid glowing bright blue)
    entityAmbient: { r: 20, g: 22, b: 35 },
    wallColor: 0x0c4a6e,  // Deep blue walls
    wallGlowColor: 0x0284c7, // Cool blue glow
    wallLineColor: 0x38bdf8, // Sky blue accents
  },
  spider_lair: {
    id: 'spider_lair',
    name: 'Spider Lair',
    floorColor: 0x1A241F,
    voidColor: 0x060907,  // Calibrated moss green backdrop
    entityAmbient: { r: 18, g: 30, b: 20 },
    wallColor: 0x143a28,  // Dark moss walls
    wallGlowColor: 0x10b981, // Emerald green glow
    wallLineColor: 0x34d399, // Mint green accents
  },
  blood_crypt: {
    id: 'blood_crypt',
    name: 'Blood Crypt',
    floorColor: 0x2B181A,
    voidColor: 0x0c0606,  // Calibrated crimson backdrop (dimmed to avoid glowing red)
    entityAmbient: { r: 35, g: 18, b: 18 },
    wallColor: 0x450a0a,  // Vicious dark crimson walls
    wallGlowColor: 0xef4444, // Blood red glow
    wallLineColor: 0xf87171, // Rose accents
  },
  crystal_mines: {
    id: 'crystal_mines',
    name: 'Crystal Mines',
    floorColor: 0x271B38,
    voidColor: 0x080512,  // Calibrated violet backdrop
    entityAmbient: { r: 30, g: 18, b: 40 },
    wallColor: 0x3b0764,  // Amethyst purple walls
    wallGlowColor: 0x9333ea, // Violet glow
    wallLineColor: 0xc084fc, // Bright lavender accents
  },
  ice_cavern: {
    id: 'ice_cavern',
    name: 'Ice Cavern',
    floorColor: 0x182B33,
    voidColor: 0x06080f,  // Calibrated ice blue backdrop
    entityAmbient: { r: 20, g: 30, b: 40 },
    wallColor: 0x155e75,  // Deep frozen cyan walls
    wallGlowColor: 0x06b6d4, // Ice cyan glow
    wallLineColor: 0x22d3ee, // Glacial blue accents
  },
  desert_tomb: {
    id: 'desert_tomb',
    name: 'Desert Tomb',
    floorColor: 0x332617,
    voidColor: 0x0a0805,  // Calibrated sand backdrop
    entityAmbient: { r: 40, g: 30, b: 20 },
    wallColor: 0x78350f,  // Ancient amber/brown walls
    wallGlowColor: 0xd97706, // Sandy orange glow
    wallLineColor: 0xfbbf24, // Warm gold accents
  },
  void_rift: {
    id: 'void_rift',
    name: 'Void Rift',
    floorColor: 0x1A0D22,
    voidColor: 0x0a0510,  // Calibrated purple void backdrop
    entityAmbient: { r: 25, g: 15, b: 35 },
    wallColor: 0x581c87,  // Corrupted void purple walls
    wallGlowColor: 0xd946ef, // Neon magenta glow
    wallLineColor: 0xf472b6, // Soft pink accents
  },
  mushroom_grotto: {
    id: 'mushroom_grotto',
    name: 'Mushroom Grotto',
    floorColor: 0x15302E,
    voidColor: 0x06090a,  // Calibrated teal backdrop
    entityAmbient: { r: 20, g: 35, b: 32 },
    wallColor: 0x115e59,  // Deep teal walls
    wallGlowColor: 0x0d9488, // Luminescent aqua glow
    wallLineColor: 0x2dd4bf, // Turquoise accents
  },
  molten_core: {
    id: 'molten_core',
    name: 'Molten Core',
    floorColor: 0x381813,
    voidColor: 0x0e0504,  // Calibrated volcanic backdrop
    entityAmbient: { r: 45, g: 22, b: 18 },
    wallColor: 0x7f1d1d,  // Scorched obsidian red walls
    wallGlowColor: 0xeab308, // Fiery yellow/amber glow
    wallLineColor: 0xf97316, // Lava orange accents
  },
  forgotten_sewers: {
    id: 'forgotten_sewers',
    name: 'Forgotten Sewers',
    floorColor: 0x292817,
    voidColor: 0x090805,  // Calibrated dirty swamp backdrop
    entityAmbient: { r: 32, g: 32, b: 18 },
    wallColor: 0x3f3c1b,  // Sludge-colored dark olive walls
    wallGlowColor: 0x84cc16, // Toxic lime green glow
    wallLineColor: 0xa3e635, // Acid green accents
  },
};

export const DUNGEON_BIOMES = Object.keys(BIOME_THEMES).filter((b) => b !== 'town');

export function getBiome(id: string | undefined): BiomeTheme {
  if (id && BIOME_THEMES[id]) {
    return BIOME_THEMES[id];
  }
  return BIOME_THEMES.dungeon_slate;
}

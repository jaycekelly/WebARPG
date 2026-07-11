export interface BiomeTheme {
  id: string;
  name: string;
  floorColor: number;
  voidColor: number;
  entityAmbient: { r: number; g: number; b: number };
}

export const BIOME_THEMES: Record<string, BiomeTheme> = {
  town: {
    id: 'town',
    name: 'Town',
    floorColor: 0x275932, // Vibrant forest green
    voidColor: 0x060d08,  // Seamless darkened forest green
    entityAmbient: { r: 15, g: 45, b: 50 }, // Crisp cyan morning shadows
  },
  dungeon_slate: {
    id: 'dungeon_slate',
    name: 'Slate Cave',
    floorColor: 0x282828,
    voidColor: 0x121212,
    entityAmbient: { r: 12, g: 12, b: 12 },
  },
  dungeon_navy: {
    id: 'dungeon_navy',
    name: 'Deep Navy Cave',
    floorColor: 0x1F2433,
    voidColor: 0x0A0A15,
    entityAmbient: { r: 8, g: 10, b: 20 },
  },
  spider_lair: {
    id: 'spider_lair',
    name: 'Spider Lair',
    floorColor: 0x1A241F,
    voidColor: 0x08100A,
    entityAmbient: { r: 6, g: 15, b: 8 },
  },
  blood_crypt: {
    id: 'blood_crypt',
    name: 'Blood Crypt',
    floorColor: 0x2B181A,
    voidColor: 0x120808,
    entityAmbient: { r: 18, g: 8, b: 8 },
  },
  crystal_mines: {
    id: 'crystal_mines',
    name: 'Crystal Mines',
    floorColor: 0x271B38,
    voidColor: 0x100818,
    entityAmbient: { r: 15, g: 8, b: 25 },
  },
  ice_cavern: {
    id: 'ice_cavern',
    name: 'Ice Cavern',
    floorColor: 0x182B33,
    voidColor: 0x080C14,
    entityAmbient: { r: 8, g: 15, b: 22 },
  },
  desert_tomb: {
    id: 'desert_tomb',
    name: 'Desert Tomb',
    floorColor: 0x332617,
    voidColor: 0x141008,
    entityAmbient: { r: 22, g: 15, b: 8 },
  },
  void_rift: {
    id: 'void_rift',
    name: 'Void Rift',
    floorColor: 0x1A0D22,
    voidColor: 0x120412,
    entityAmbient: { r: 10, g: 5, b: 15 },
  },
  mushroom_grotto: {
    id: 'mushroom_grotto',
    name: 'Mushroom Grotto',
    floorColor: 0x15302E,
    voidColor: 0x081212,
    entityAmbient: { r: 8, g: 20, b: 18 },
  },
  molten_core: {
    id: 'molten_core',
    name: 'Molten Core',
    floorColor: 0x381813,
    voidColor: 0x1A0604,
    entityAmbient: { r: 25, g: 10, b: 8 },
  },
  forgotten_sewers: {
    id: 'forgotten_sewers',
    name: 'Forgotten Sewers',
    floorColor: 0x292817,
    voidColor: 0x0A0A05,
    entityAmbient: { r: 18, g: 18, b: 8 },
  },
};

export const DUNGEON_BIOMES = Object.keys(BIOME_THEMES).filter((b) => b !== 'town');

export function getBiome(id: string | undefined): BiomeTheme {
  if (id && BIOME_THEMES[id]) {
    return BIOME_THEMES[id];
  }
  return BIOME_THEMES.dungeon_slate;
}

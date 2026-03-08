/**
 * All 22 level configurations.
 * Maps are generated procedurally from TypeScript templates.
 * Heart/decoy/powerup positions are hand-placed here.
 */
import { Season, HeartType, PowerupType } from '../types';
import type { LevelConfig } from '../types';
import {
  makeSpringMap, makeSummerMap, makeAutumnMap, makeWinterMap, makeFinaleMap,
} from './levelMaps';

function h(tx: number, ty: number, type = HeartType.Normal, moveDelayMs?: number): LevelConfig['hearts'][0] {
  return { pos: { tx, ty }, type, hiddenIn: 'grass', moveDelayMs };
}

function d(tx: number, ty: number): NonNullable<LevelConfig['decoys']>[0] {
  return { pos: { tx, ty } };
}

function p(tx: number, ty: number, type: PowerupType): LevelConfig['powerups'][0] {
  return { pos: { tx, ty }, type };
}

const SPRING_HINTS = [
  "Hey Dancy! Try checking the tall grass near the flowers in the north!",
  "Psst! I hid one near the fence in the east corner!",
  "Look carefully near the big tree on the left side!",
];
const SUMMER_HINTS = [
  "The hearts here are a bit shy — try sneaking up on them slowly!",
  "Check the sunflower patches — hearts love to hide there!",
  "Some of them fluttered toward the water edge!",
];
const AUTUMN_HINTS = [
  "Watch out for the red berries — those are mine, hehe! Real hearts are in the leaf piles!",
  "Try the area near the old log in the north!",
  "I saw something sparkling by the mushroom cluster!",
];
const WINTER_HINTS = [
  "Remember to shovel the snow before you check underneath!",
  "Try the snowy patches in the far corners — I hid some there!",
  "The snowdrifts near the trees are worth checking!",
];

// ─── SPRING (Levels 1–5) ────────────────────────────────────────────────────

const level01: LevelConfig = {
  id: 1, season: Season.Spring, displayName: 'Buttercup Meadow',
  map: { width: 20, height: 15, tilesetKey: 'tileset-spring', ...makeSpringMap(20, 15, 1) },
  playerStart: { tx: 10, ty: 7 },
  heartsRequired: 5,
  hearts: [
    h(5,5), h(12,3), h(8,9), h(16,8), h(6,6),
  ],
  powerups: [p(10, 5, PowerupType.SweetScent)],
  introMessages: [
    "Hearts are hiding in the tall grass! Walk up to a patch and press Z to search it.",
    "You'll find a Sweet Scent powerup here. Collect it, then press Q to reveal nearby hearts for a few seconds!",
  ],
  hintText: SPRING_HINTS,
  musicKey: 'music-spring',
  scrapbookEntryId: 1,
};

const level02: LevelConfig = {
  id: 2, season: Season.Spring, displayName: 'Sunlit Path',
  map: { width: 20, height: 15, tilesetKey: 'tileset-spring', ...makeSpringMap(20, 15, 2) },
  playerStart: { tx: 3, ty: 7 },
  heartsRequired: 8,
  hearts: [
    h(3,4), h(10,6), h(11,6),
    h(16,4), h(6,10),
    h(9,11), h(12,7), h(18,5),
  ],
  powerups: [p(13, 7, PowerupType.SweetScent)],
  hintText: SPRING_HINTS,
  musicKey: 'music-spring',
  scrapbookEntryId: 2,
};

const level03: LevelConfig = {
  id: 3, season: Season.Spring, displayName: 'Buttercup Fields',
  map: { width: 22, height: 17, tilesetKey: 'tileset-spring', ...makeSpringMap(22, 17, 3) },
  playerStart: { tx: 11, ty: 8 },
  heartsRequired: 10,
  hearts: [
    h(4,3), h(5,3), h(9,5),
    h(15,7), h(16,7),
    h(7,10), h(8,11),
    h(14,12), h(15,12), h(11,6),
  ],
  powerups: [
    p(11, 8, PowerupType.SweetScent),
    p(5, 14, PowerupType.RunningShoes),
  ],
  introMessages: [
    "New item: Running Shoes! Find the pickup in the meadow, then hold Shift to dash.",
  ],
  hintText: SPRING_HINTS,
  musicKey: 'music-spring',
  scrapbookEntryId: 3,
};

const level04: LevelConfig = {
  id: 4, season: Season.Spring, displayName: 'The Winding Creek',
  map: { width: 22, height: 17, tilesetKey: 'tileset-spring', ...makeSpringMap(22, 17, 4) },
  playerStart: { tx: 11, ty: 8 },
  heartsRequired: 13,
  hearts: [
    h(4,3), h(6,4),
    h(9,5), h(11,5), h(12,6), h(10,7),
    h(15,7), h(17,8),
    h(7,10), h(8,11), h(7,12),
    h(14,11), h(16,12),
  ],
  powerups: [
    p(11, 4, PowerupType.SweetScent),
    p(18, 12, PowerupType.RunningShoes),
  ],
  hintText: SPRING_HINTS,
  musicKey: 'music-spring',
  scrapbookEntryId: 4,
};

const level05: LevelConfig = {
  id: 5, season: Season.Spring, displayName: "Spring's End",
  map: { width: 22, height: 17, tilesetKey: 'tileset-spring', ...makeSpringMap(22, 17, 5) },
  playerStart: { tx: 3, ty: 3 },
  heartsRequired: 16,
  hearts: [
    h(4,3), h(6,3), h(5,4),
    h(9,5), h(12,5), h(11,6), h(10,7),
    h(15,7), h(17,7), h(15,8),
    h(7,10), h(8,11), h(7,12),
    h(14,11), h(16,11), h(17,12),
  ],
  powerups: [
    p(11, 8, PowerupType.SweetScent),
    p(18, 3, PowerupType.RunningShoes),
  ],
  hintText: SPRING_HINTS,
  musicKey: 'music-spring',
  scrapbookEntryId: 5,
};

// ─── SUMMER (Levels 6–12) ───────────────────────────────────────────────────

function summerHeart(tx: number, ty: number): LevelConfig['hearts'][0] {
  return h(tx, ty, HeartType.Moving, 3000);
}
function summerHeartFast(tx: number, ty: number): LevelConfig['hearts'][0] {
  return h(tx, ty, HeartType.Moving, 1800);
}

const level06: LevelConfig = {
  id: 6, season: Season.Summer, displayName: 'The Warm Meadow',
  map: { width: 25, height: 20, tilesetKey: 'tileset-summer', ...makeSummerMap(25, 20, 1) },
  playerStart: { tx: 12, ty: 10 },
  heartsRequired: 12,
  hearts: [
    // Mix of static and moving
    h(4,4), h(5,4), h(6,4), h(4,5), h(5,5),
    h(12,3), h(13,3), h(14,3), h(12,4),
    h(8,8), h(9,8), h(10,8), h(8,9),
    h(16,6), h(17,6), h(18,6),
    summerHeart(7,12), summerHeart(14,10), summerHeart(20,8),
    summerHeart(5,15), summerHeart(10,16), summerHeart(18,15),
    h(22,4), h(23,4), h(3,16), h(22,16), h(11,12), h(15,14), h(3,11),
  ],
  powerups: [
    p(12, 10, PowerupType.SweetScent),
    p(20, 16, PowerupType.RunningShoes),
  ],
  introMessages: [
    "Welcome to Summer! Hearts are moving now — they flutter away if you get too close. Sneak up carefully!",
  ],
  hintText: SUMMER_HINTS,
  musicKey: 'music-summer',
  scrapbookEntryId: 6,
};

const level07: LevelConfig = {
  id: 7, season: Season.Summer, displayName: 'Sunflower Hollow',
  map: { width: 25, height: 20, tilesetKey: 'tileset-summer', ...makeSummerMap(25, 20, 2) },
  playerStart: { tx: 3, ty: 10 },
  heartsRequired: 14,
  hearts: [
    h(3,3), h(4,3), h(5,3), h(6,3), h(3,4), h(4,4),
    h(9,5), h(10,5), h(11,5), h(12,5), h(9,6),
    h(17,4), h(18,4), h(19,4), h(17,5),
    h(5,10), h(6,10), h(7,10), h(8,10),
    h(15,10), h(16,10), h(17,10), h(15,11),
    summerHeart(8,14), summerHeart(15,14), summerHeart(3,17),
    summerHeart(12,17), summerHeart(22,12), summerHeart(20,17),
    h(23,4), h(3,18), h(23,18), h(12,2), h(22,7),
  ],
  powerups: [
    p(12, 10, PowerupType.SweetScent),
    p(5, 18, PowerupType.RunningShoes),
  ],
  hintText: SUMMER_HINTS,
  musicKey: 'music-summer',
  scrapbookEntryId: 7,
};

const level08: LevelConfig = {
  id: 8, season: Season.Summer, displayName: 'The Long Afternoon',
  map: { width: 28, height: 22, tilesetKey: 'tileset-summer', ...makeSummerMap(28, 22, 3) },
  playerStart: { tx: 14, ty: 11 },
  heartsRequired: 15,
  hearts: Array.from({ length: 40 }, (_, i) => {
    const tx = 3 + (i % 8) * 3;
    const ty = 3 + Math.floor(i / 8) * 4;
    return i < 25 ? h(tx, ty) : summerHeart(tx, ty);
  }),
  powerups: [
    p(14, 5, PowerupType.SweetScent),
    p(4, 18, PowerupType.RunningShoes),
    p(24, 18, PowerupType.SweetScent),
  ],
  hintText: SUMMER_HINTS,
  musicKey: 'music-summer',
  scrapbookEntryId: 8,
};

const level09: LevelConfig = {
  id: 9, season: Season.Summer, displayName: 'Golden Grass',
  map: { width: 28, height: 22, tilesetKey: 'tileset-summer', ...makeSummerMap(28, 22, 4) },
  playerStart: { tx: 14, ty: 11 },
  heartsRequired: 18,
  hearts: Array.from({ length: 45 }, (_, i) => {
    const tx = 3 + (i % 9) * 3;
    const ty = 3 + Math.floor(i / 9) * 3;
    return i < 28 ? h(tx, ty) : summerHeartFast(tx, ty);
  }),
  powerups: [
    p(14, 11, PowerupType.SweetScent),
    p(5, 5, PowerupType.RunningShoes),
    p(23, 18, PowerupType.Mower),
  ],
  hintText: SUMMER_HINTS,
  musicKey: 'music-summer',
  scrapbookEntryId: 9,
};

const level10: LevelConfig = {
  id: 10, season: Season.Summer, displayName: 'The Still Lake',
  map: { width: 30, height: 22, tilesetKey: 'tileset-summer', ...makeSummerMap(30, 22, 5) },
  playerStart: { tx: 15, ty: 11 },
  heartsRequired: 20,
  hearts: Array.from({ length: 47 }, (_, i) => {
    const tx = 2 + (i % 10) * 3;
    const ty = 3 + Math.floor(i / 10) * 3;
    return i < 30 ? h(tx, ty) : summerHeartFast(tx, ty);
  }),
  powerups: [
    p(15, 5, PowerupType.SweetScent),
    p(5, 18, PowerupType.RunningShoes),
    p(25, 18, PowerupType.Mower),
  ],
  hintText: SUMMER_HINTS,
  musicKey: 'music-summer',
  scrapbookEntryId: 10,
};

const level11: LevelConfig = {
  id: 11, season: Season.Summer, displayName: 'Cicada Song',
  map: { width: 30, height: 22, tilesetKey: 'tileset-summer', ...makeSummerMap(30, 22, 6) },
  playerStart: { tx: 15, ty: 11 },
  heartsRequired: 22,
  hearts: Array.from({ length: 49 }, (_, i) => {
    const tx = 2 + (i % 10) * 3;
    const ty = 2 + Math.floor(i / 10) * 3;
    return i < 28 ? h(tx, ty) : summerHeartFast(tx, ty);
  }),
  powerups: [
    p(15, 11, PowerupType.SweetScent),
    p(4, 4, PowerupType.RunningShoes),
    p(26, 4, PowerupType.Mower),
  ],
  hintText: SUMMER_HINTS,
  musicKey: 'music-summer',
  scrapbookEntryId: 11,
};

const level12: LevelConfig = {
  id: 12, season: Season.Summer, displayName: 'Last of Summer',
  map: { width: 30, height: 22, tilesetKey: 'tileset-summer', ...makeSummerMap(30, 22, 7) },
  playerStart: { tx: 15, ty: 11 },
  heartsRequired: 25,
  hearts: Array.from({ length: 50 }, (_, i) => {
    const tx = 2 + (i % 10) * 3;
    const ty = 2 + Math.floor(i / 10) * 4;
    return summerHeartFast(tx, ty);
  }),
  powerups: [
    p(15, 11, PowerupType.SweetScent),
    p(3, 20, PowerupType.RunningShoes),
    p(27, 20, PowerupType.Mower),
    p(15, 3, PowerupType.SweetScent),
  ],
  hintText: SUMMER_HINTS,
  musicKey: 'music-summer',
  scrapbookEntryId: 12,
};

// ─── AUTUMN (Levels 13–18) ──────────────────────────────────────────────────

const level13: LevelConfig = {
  id: 13, season: Season.Autumn, displayName: 'The Red Forest',
  map: { width: 30, height: 25, tilesetKey: 'tileset-autumn', ...makeAutumnMap(30, 25, 1) },
  playerStart: { tx: 15, ty: 12 },
  heartsRequired: 20,
  hearts: Array.from({ length: 55 }, (_, i) => h(2 + (i%11)*2, 2 + Math.floor(i/11)*4)),
  decoys: [d(8,8), d(16,5), d(22,12), d(5,18), d(25,18)],
  powerups: [
    p(15, 6, PowerupType.SweetScent),
    p(5, 22, PowerupType.RunningShoes),
    p(25, 22, PowerupType.Mower),
  ],
  introMessages: [
    "Welcome to Autumn! Watch out — some red berries look just like hearts. Triggering a decoy will cost you the Master Catcher title!",
    "New item: Mower! Collect it and press E to clear tall grass around you all at once.",
  ],
  hintText: AUTUMN_HINTS,
  musicKey: 'music-autumn',
  scrapbookEntryId: 13,
};

const level14: LevelConfig = {
  id: 14, season: Season.Autumn, displayName: 'Fallen Leaves',
  map: { width: 30, height: 25, tilesetKey: 'tileset-autumn', ...makeAutumnMap(30, 25, 2) },
  playerStart: { tx: 15, ty: 12 },
  heartsRequired: 24,
  hearts: Array.from({ length: 60 }, (_, i) => h(2 + (i%11)*2, 2 + Math.floor(i/11)*3)),
  decoys: [d(7,7), d(14,4), d(21,8), d(4,16), d(18,16), d(24,20), d(9,20)],
  powerups: [
    p(15, 12, PowerupType.SweetScent),
    p(4, 22, PowerupType.RunningShoes),
    p(26, 22, PowerupType.Mower),
  ],
  hintText: AUTUMN_HINTS,
  musicKey: 'music-autumn',
  scrapbookEntryId: 14,
};

const level15: LevelConfig = {
  id: 15, season: Season.Autumn, displayName: 'The Amber Grove',
  map: { width: 32, height: 25, tilesetKey: 'tileset-autumn', ...makeAutumnMap(32, 25, 3) },
  playerStart: { tx: 16, ty: 12 },
  heartsRequired: 28,
  hearts: Array.from({ length: 65 }, (_, i) => h(2 + (i%11)*3, 2 + Math.floor(i/11)*3)),
  decoys: [d(6,6), d(13,4), d(22,6), d(4,14), d(15,13), d(26,14), d(8,20), d(22,20)],
  powerups: [
    p(16, 6, PowerupType.SweetScent),
    p(4, 22, PowerupType.RunningShoes),
    p(28, 22, PowerupType.Mower),
  ],
  hintText: AUTUMN_HINTS,
  musicKey: 'music-autumn',
  scrapbookEntryId: 15,
};

const level16: LevelConfig = {
  id: 16, season: Season.Autumn, displayName: 'Hollow Tree',
  map: { width: 35, height: 25, tilesetKey: 'tileset-autumn', ...makeAutumnMap(35, 25, 4) },
  playerStart: { tx: 17, ty: 12 },
  heartsRequired: 30,
  hearts: Array.from({ length: 70 }, (_, i) => h(2 + (i%12)*3, 2 + Math.floor(i/12)*3)),
  decoys: Array.from({ length: 10 }, (_, i) => d(5 + i * 3, 5 + (i % 3) * 6)),
  powerups: [
    p(17, 6, PowerupType.SweetScent),
    p(5, 23, PowerupType.RunningShoes),
    p(30, 23, PowerupType.Mower),
    p(17, 23, PowerupType.SweetScent),
  ],
  hintText: AUTUMN_HINTS,
  musicKey: 'music-autumn',
  scrapbookEntryId: 16,
};

const level17: LevelConfig = {
  id: 17, season: Season.Autumn, displayName: 'The Fog Path',
  map: { width: 35, height: 25, tilesetKey: 'tileset-autumn', ...makeAutumnMap(35, 25, 5) },
  playerStart: { tx: 17, ty: 12 },
  heartsRequired: 34,
  hearts: Array.from({ length: 75 }, (_, i) => h(2 + (i%12)*3, 2 + Math.floor(i/12)*3)),
  decoys: Array.from({ length: 12 }, (_, i) => d(4 + i * 3, 4 + (i % 4) * 5)),
  powerups: [
    p(17, 12, PowerupType.SweetScent),
    p(4, 23, PowerupType.RunningShoes),
    p(31, 23, PowerupType.Mower),
  ],
  hintText: AUTUMN_HINTS,
  musicKey: 'music-autumn',
  scrapbookEntryId: 17,
};

const level18: LevelConfig = {
  id: 18, season: Season.Autumn, displayName: "Autumn's Last Leaf",
  map: { width: 35, height: 25, tilesetKey: 'tileset-autumn', ...makeAutumnMap(35, 25, 6) },
  playerStart: { tx: 17, ty: 12 },
  heartsRequired: 38,
  hearts: Array.from({ length: 80 }, (_, i) => h(2 + (i%12)*3, 2 + Math.floor(i/12)*2)),
  decoys: Array.from({ length: 15 }, (_, i) => d(4 + i * 2, 4 + (i % 5) * 4)),
  powerups: [
    p(17, 6, PowerupType.SweetScent),
    p(5, 23, PowerupType.RunningShoes),
    p(30, 23, PowerupType.Mower),
    p(17, 23, PowerupType.SweetScent),
    p(5, 5, PowerupType.Mower),
  ],
  hintText: AUTUMN_HINTS,
  musicKey: 'music-autumn',
  scrapbookEntryId: 18,
};

// ─── WINTER (Levels 19–21) ──────────────────────────────────────────────────

const level19: LevelConfig = {
  id: 19, season: Season.Winter, displayName: 'First Snow',
  map: { width: 40, height: 30, tilesetKey: 'tileset-winter', ...makeWinterMap(40, 30, 1) },
  playerStart: { tx: 20, ty: 15 },
  heartsRequired: 28,
  hearts: Array.from({ length: 85 }, (_, i) => h(2 + (i%14)*3, 2 + Math.floor(i/14)*4)),
  snowTiles: Array.from({ length: 20 }, (_, i) => ({
    tx: 4 + (i % 6) * 6,
    ty: 4 + Math.floor(i / 6) * 7,
  })),
  fogEnabled: false,
  powerups: [
    p(20, 8, PowerupType.SweetScent),
    p(5, 27, PowerupType.RunningShoes),
    p(35, 27, PowerupType.Mower),
    p(20, 27, PowerupType.SweetScent),
  ],
  introMessages: [
    "Welcome to Winter! Snow is covering everything. Press Z on a snow tile to shovel it before you can search underneath.",
  ],
  hintText: WINTER_HINTS,
  musicKey: 'music-winter',
  scrapbookEntryId: 19,
};

const level20: LevelConfig = {
  id: 20, season: Season.Winter, displayName: 'Deep Winter',
  map: { width: 40, height: 30, tilesetKey: 'tileset-winter', ...makeWinterMap(40, 30, 2) },
  playerStart: { tx: 20, ty: 15 },
  heartsRequired: 32,
  hearts: Array.from({ length: 90 }, (_, i) => h(2 + (i%14)*3, 2 + Math.floor(i/14)*3)),
  snowTiles: Array.from({ length: 25 }, (_, i) => ({
    tx: 3 + (i % 7) * 5,
    ty: 3 + Math.floor(i / 7) * 6,
  })),
  fogEnabled: true,
  powerups: [
    p(20, 8, PowerupType.SweetScent),
    p(5, 27, PowerupType.RunningShoes),
    p(35, 27, PowerupType.Mower),
    p(20, 15, PowerupType.SweetScent),
  ],
  hintText: WINTER_HINTS,
  musicKey: 'music-winter',
  scrapbookEntryId: 20,
};

const level21: LevelConfig = {
  id: 21, season: Season.Winter, displayName: 'Before the Thaw',
  map: { width: 40, height: 30, tilesetKey: 'tileset-winter', ...makeWinterMap(40, 30, 3) },
  playerStart: { tx: 20, ty: 15 },
  heartsRequired: 38,
  hearts: Array.from({ length: 100 }, (_, i) => h(2 + (i%14)*3, 2 + Math.floor(i/14)*3)),
  snowTiles: Array.from({ length: 30 }, (_, i) => ({
    tx: 3 + (i % 8) * 5,
    ty: 3 + Math.floor(i / 8) * 5,
  })),
  fogEnabled: true,
  fogPunchOut: false,
  powerups: [
    p(20, 8, PowerupType.SweetScent),
    p(5, 27, PowerupType.RunningShoes),
    p(35, 27, PowerupType.Mower),
    p(20, 27, PowerupType.SweetScent),
    p(5, 8, PowerupType.Mower),
    p(35, 8, PowerupType.SweetScent),
  ],
  hintText: WINTER_HINTS,
  musicKey: 'music-winter',
  scrapbookEntryId: 21,
};

// ─── FINALE (Level 22) ──────────────────────────────────────────────────────

const level22: LevelConfig = {
  id: 22, season: Season.Finale, displayName: 'The Birthday Grove 🎂',
  map: { width: 35, height: 25, tilesetKey: 'tileset-spring', ...makeFinaleMap(35, 25) },
  playerStart: { tx: 17, ty: 20 },
  heartsRequired: 22,
  hearts: [
    h(5,5,  HeartType.Golden), h(10,5, HeartType.Golden), h(15,5, HeartType.Golden),
    h(20,5, HeartType.Golden), h(25,5, HeartType.Golden), h(30,5, HeartType.Golden),
    h(5,10, HeartType.Golden), h(10,10,HeartType.Golden), h(15,10,HeartType.Golden),
    h(20,10,HeartType.Golden), h(25,10,HeartType.Golden), h(30,10,HeartType.Golden),
    h(5,15, HeartType.Golden), h(10,15,HeartType.Golden), h(15,15,HeartType.Golden),
    h(20,15,HeartType.Golden), h(25,15,HeartType.Golden), h(30,15,HeartType.Golden),
    h(8,20, HeartType.Golden), h(14,20,HeartType.Golden),
    h(20,20,HeartType.Golden), h(26,20,HeartType.Golden),
  ],
  powerups: [],
  hintText: ["These are golden — one for every year of your beautiful life. You're almost there, Dancy!"],
  musicKey: 'music-finale',
  scrapbookEntryId: 22,
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const ALL_LEVELS: LevelConfig[] = [
  level01, level02, level03, level04, level05,
  level06, level07, level08, level09, level10, level11, level12,
  level13, level14, level15, level16, level17, level18,
  level19, level20, level21,
  level22,
];

export function getLevelById(id: number): LevelConfig | undefined {
  return ALL_LEVELS.find(l => l.id === id);
}

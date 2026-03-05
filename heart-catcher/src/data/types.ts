/** All shared TypeScript interfaces and enums for Heart Catcher */

export enum Season {
  Spring = 'spring',
  Summer = 'summer',
  Autumn = 'autumn',
  Winter = 'winter',
  Finale = 'finale',
}

export enum HeartType {
  Normal = 'normal',
  Moving = 'moving',
  Golden = 'golden',
}

export enum PowerupType {
  RunningShoes = 'running_shoes',
  SweetScent = 'sweet_scent',
  Mower = 'mower',
  MemoryFragment = 'memory_fragment',
}

export interface TilePos {
  tx: number;
  ty: number;
}

export interface HeartConfig {
  pos: TilePos;
  type: HeartType;
  hiddenIn: 'grass' | 'flower' | 'log' | 'snowdrift' | 'foliage';
  /** Summer only: ms between move attempts */
  moveDelayMs?: number;
}

export interface DecoyConfig {
  pos: TilePos;
}

export interface PowerupConfig {
  pos: TilePos;
  type: PowerupType;
  /** Index into photos array for MemoryFragment powerups */
  photoIndex?: number;
}

export interface LevelMap {
  width: number;
  height: number;
  tilesetKey: string;
  /** Flat tile index arrays. 0 = empty. Index = ty * width + tx */
  ground: number[];
  decoration: number[];
  obstacles: number[];
  overhead: number[];
}

export interface LevelConfig {
  id: number;
  season: Season;
  displayName: string;
  map: LevelMap;
  playerStart: TilePos;
  heartsRequired: number;
  hearts: HeartConfig[];
  decoys?: DecoyConfig[];
  /** Winter only: tiles that must be shoveled before interaction */
  snowTiles?: TilePos[];
  fogEnabled?: boolean;
  powerups: PowerupConfig[];
  hintText: string[];
  /** Shown once at level start in sequence via DialogueBox — explains new mechanics */
  introMessages?: string[];
  musicKey: string;
  scrapbookEntryId: number;
}

export interface ScrapbookEntry {
  id: number;
  levelId: number;
  title: string;
  message: string;
}

export interface LevelSave {
  completed: boolean;
  bestTimeMs: number;
  heartsFound: number;
  masterCatcher: boolean;
}

export interface SaveData {
  currentLevel: number;
  levels: Record<number, LevelSave>;
  scrapbookReadIds: number[];
}

export interface WorldObject {
  worldX: number;
  worldY: number;
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void;
}

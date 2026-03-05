import type { LevelMap, TilePos } from '../data/types';

export const TILE_SIZE = 16;

export function tileToWorld(t: number): number {
  return t * TILE_SIZE + TILE_SIZE / 2;
}

export function worldToTile(w: number): number {
  return Math.floor(w / TILE_SIZE);
}

export function tilePosToWorld(pos: TilePos): { x: number; y: number } {
  return { x: tileToWorld(pos.tx), y: tileToWorld(pos.ty) };
}

export function worldToTilePos(x: number, y: number): TilePos {
  return { tx: worldToTile(x), ty: worldToTile(y) };
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/**
 * CollisionMap — tile walkability grid.
 * Built from the level's obstacles layer: any non-zero tile = solid.
 */
export class CollisionMap {
  private width = 0;
  private height = 0;
  private grid: boolean[] = []; // true = walkable

  load(map: LevelMap): void {
    this.width = map.width;
    this.height = map.height;
    this.grid = map.obstacles.map(t => t === 0);
  }

  isWalkable(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return false;
    return this.grid[ty * this.width + tx];
  }

  isWalkablePos(pos: TilePos): boolean {
    return this.isWalkable(pos.tx, pos.ty);
  }

  setWalkable(tx: number, ty: number, value: boolean): void {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return;
    this.grid[ty * this.width + tx] = value;
  }

  /** Returns walkable neighbors (8-directional) */
  walkableNeighbors(pos: TilePos): TilePos[] {
    const dirs = [
      { tx: -1, ty: 0 }, { tx: 1, ty: 0 },
      { tx: 0, ty: -1 }, { tx: 0, ty: 1 },
      { tx: -1, ty: -1 }, { tx: 1, ty: -1 },
      { tx: -1, ty: 1 }, { tx: 1, ty: 1 },
    ];
    return dirs
      .map(d => ({ tx: pos.tx + d.tx, ty: pos.ty + d.ty }))
      .filter(p => this.isWalkable(p.tx, p.ty));
  }

  get mapWidth(): number { return this.width; }
  get mapHeight(): number { return this.height; }
}

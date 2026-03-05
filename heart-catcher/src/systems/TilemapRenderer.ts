import type { AssetLoader } from '../engine/AssetLoader';
import type { LevelMap } from '../data/types';
import type { CameraController } from './CameraController';
import { TILE_SIZE } from './CollisionMap';

const TILESET_COLS = 10; // 160px wide / 16px = 10 tiles per row

/**
 * TilemapRenderer — draws tile layers from LevelMap data using ctx.drawImage.
 * Draw order: ground → decoration → obstacles → [y-sorted world objects] → overhead
 */
export class TilemapRenderer {
  private map: LevelMap | null = null;
  private tileset: HTMLImageElement | null = null;

  constructor(private readonly assets: AssetLoader) {}

  loadMap(map: LevelMap): void {
    this.map = map;
    this.tileset = this.assets.getImage(map.tilesetKey);
  }

  /** Draw ground and decoration layers (below player) */
  renderBelow(ctx: CanvasRenderingContext2D, cam: CameraController): void {
    if (!this.map) return;
    this.drawLayer(ctx, cam, this.map.ground);
    this.drawLayer(ctx, cam, this.map.decoration);
  }

  /** Draw obstacle layer (trunks etc — uses Y-sort with world objects) */
  renderObstacles(ctx: CanvasRenderingContext2D, cam: CameraController): void {
    if (!this.map) return;
    this.drawLayer(ctx, cam, this.map.obstacles);
  }

  /** Draw overhead layer (canopies — always above player) */
  renderOverhead(ctx: CanvasRenderingContext2D, cam: CameraController): void {
    if (!this.map) return;
    this.drawLayer(ctx, cam, this.map.overhead);
  }

  private drawLayer(
    ctx: CanvasRenderingContext2D,
    cam: CameraController,
    layer: number[],
  ): void {
    if (!this.map || !this.tileset) return;

    const { width, height } = this.map;

    // Only draw tiles visible in the viewport (culling)
    const startTX = Math.max(0, Math.floor(cam.x / TILE_SIZE));
    const startTY = Math.max(0, Math.floor(cam.y / TILE_SIZE));
    const endTX = Math.min(width, Math.ceil((cam.x + cam.viewWidth) / TILE_SIZE));
    const endTY = Math.min(height, Math.ceil((cam.y + cam.viewHeight) / TILE_SIZE));

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const tileIndex = layer[ty * width + tx];
        if (!tileIndex) continue; // 0 = empty

        const srcX = ((tileIndex - 1) % TILESET_COLS) * TILE_SIZE;
        const srcY = Math.floor((tileIndex - 1) / TILESET_COLS) * TILE_SIZE;

        const screenX = tx * TILE_SIZE - cam.x;
        const screenY = ty * TILE_SIZE - cam.y;

        ctx.drawImage(
          this.tileset,
          srcX, srcY, TILE_SIZE, TILE_SIZE,
          screenX, screenY, TILE_SIZE, TILE_SIZE,
        );
      }
    }
  }
}

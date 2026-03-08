import type { AssetLoader } from '../engine/AssetLoader';
import type { LevelMap } from '../data/types';
import type { CameraController } from './CameraController';
import { TILE_SIZE } from './CollisionMap';

const TILESET_COLS = 10; // 160px wide / 16px = 10 tiles per row

// Tile IDs replaced by PNG sprites — skip drawing from tileset
const SPRITE_TILE_IDS = new Set([4, 10, 11, 12, 21, 22, 23, 31, 32, 41, 42]);

// Grass tile IDs — suppressed when a ground texture is active
const GRASS_TILE_IDS  = new Set([1, 2, 3]);

// Tile anchors for sprite scanning
const TREE_BL  = 21; // bottom-left of 2×2 tree trunk (obstacle layer)
const BUSH_ID  = 4;  // berry bush (ground layer)
const FERN_ID  = 10; // tall grass / path border (ground layer)

const BUSH_SPRITE_SIZE = 22;
const FERN_SPRITE_SIZE = 20;

// Drawn size (screen pixels) of one ground-texture tile repeat
const GROUND_TEXTURE_TILE = 32;

type SpriteObject = { wx: number; wy: number; img: CanvasImageSource };

/**
 * TilemapRenderer — draws tile layers from LevelMap data using ctx.drawImage.
 * Draw order: ground → decoration → obstacles → [y-sorted world objects] → overhead
 *
 * Tree, bush, and fern tile IDs are skipped in the tileset pass and rendered as
 * full PNG sprites at appropriate draw passes:
 *   - Ferns: renderBelow() (ground level, below player)
 *   - Bushes: renderObstacles() (player height, natural layering)
 *   - Trees:  renderOverhead() (above player, canopy covers player)
 */
export class TilemapRenderer {
  private map: LevelMap | null = null;
  private tileset: HTMLImageElement | null = null;

  private treeSprites: HTMLImageElement[] = [];
  private treeObjects: SpriteObject[] = [];

  private bushSprites: HTMLImageElement[] = [];
  private bushObjects: SpriteObject[] = [];

  private fernSprites: HTMLImageElement[] = [];
  private fernObjects: SpriteObject[] = [];

  private treeSpriteSize = 40;
  private groundTextureImg: HTMLImageElement | null = null;
  private spritePostProcess: ((img: HTMLImageElement) => CanvasImageSource) | null = null;

  constructor(private readonly assets: AssetLoader) {}

  loadMap(map: LevelMap): void {
    this.map = map;
    this.tileset = this.assets.getImage(map.tilesetKey);
    this.buildAllObjects();
  }

  setTreeSprites(imgs: HTMLImageElement[]): void {
    this.treeSprites = imgs;
    this.buildTreeObjects();
  }

  setBushSprites(imgs: HTMLImageElement[]): void {
    this.bushSprites = imgs;
    this.buildBushObjects();
  }

  setFernSprites(imgs: HTMLImageElement[]): void {
    this.fernSprites = imgs;
    this.buildFernObjects();
  }

  setTreeSpriteSize(size: number): void {
    this.treeSpriteSize = size;
  }

  /** Replace grass tiles with a tiled texture image (pass null to disable). */
  setGroundTexture(img: HTMLImageElement | null): void {
    this.groundTextureImg = img;
  }

  /**
   * Apply a post-processor to every sprite image when building sprite objects.
   * Pass null to remove. Triggers a rebuild of all sprite objects.
   */
  setSpritePostProcess(fn: ((img: HTMLImageElement) => CanvasImageSource) | null): void {
    this.spritePostProcess = fn;
    this.buildAllObjects();
  }

  private processImg(img: HTMLImageElement): CanvasImageSource {
    return this.spritePostProcess ? this.spritePostProcess(img) : img;
  }

  private buildAllObjects(): void {
    this.buildTreeObjects();
    this.buildBushObjects();
    this.buildFernObjects();
  }

  private buildTreeObjects(): void {
    this.treeObjects = [];
    if (!this.map || this.treeSprites.length === 0) return;
    const { width, height, obstacles } = this.map;
    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        if (obstacles[ty * width + tx] === TREE_BL) {
          const v = (tx * 3 + ty * 7) % this.treeSprites.length;
          this.treeObjects.push({ wx: tx * TILE_SIZE, wy: ty * TILE_SIZE, img: this.processImg(this.treeSprites[v]) });
        }
      }
    }
  }

  private buildBushObjects(): void {
    this.bushObjects = [];
    if (!this.map || this.bushSprites.length === 0) return;
    const { width, height, ground } = this.map;
    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        if (ground[ty * width + tx] === BUSH_ID) {
          const v = (tx * 3 + ty * 7) % this.bushSprites.length;
          this.bushObjects.push({ wx: tx * TILE_SIZE, wy: ty * TILE_SIZE, img: this.processImg(this.bushSprites[v]) });
        }
      }
    }
  }

  private buildFernObjects(): void {
    this.fernObjects = [];
    if (!this.map || this.fernSprites.length === 0) return;
    const { width, height, ground } = this.map;
    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        if (ground[ty * width + tx] === FERN_ID) {
          const v = (tx * 3 + ty * 7) % this.fernSprites.length;
          this.fernObjects.push({ wx: tx * TILE_SIZE, wy: ty * TILE_SIZE, img: this.processImg(this.fernSprites[v]) });
        }
      }
    }
  }

  /** Draw ground and decoration layers (below player), plus fern sprites */
  renderBelow(ctx: CanvasRenderingContext2D, cam: CameraController): void {
    if (!this.map) return;
    this.renderGroundTexture(ctx, cam);
    this.drawLayer(ctx, cam, this.map.ground, 0, true);
    this.drawLayer(ctx, cam, this.map.decoration);
    this.renderSprites(ctx, cam, this.fernObjects, FERN_SPRITE_SIZE);
  }

  /** Draw obstacle layer, plus bush sprites at player height */
  renderObstacles(ctx: CanvasRenderingContext2D, cam: CameraController): void {
    if (!this.map) return;
    this.drawLayer(ctx, cam, this.map.obstacles, 0, true);
    this.renderSprites(ctx, cam, this.bushObjects, BUSH_SPRITE_SIZE);
  }

  /** Draw overhead layer (canopies — always above player), then tree sprites */
  renderOverhead(ctx: CanvasRenderingContext2D, cam: CameraController): void {
    if (!this.map) return;
    this.drawLayer(ctx, cam, this.map.overhead, -6);
    this.renderSprites(ctx, cam, this.treeObjects, this.treeSpriteSize);
  }

  private renderGroundTexture(ctx: CanvasRenderingContext2D, cam: CameraController): void {
    const img = this.groundTextureImg;
    if (!img) return;
    const ts = GROUND_TEXTURE_TILE;
    const startX = Math.floor(cam.x / ts) * ts;
    const startY = Math.floor(cam.y / ts) * ts;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (let wx = startX; wx < cam.x + cam.viewWidth + ts; wx += ts) {
      for (let wy = startY; wy < cam.y + cam.viewHeight + ts; wy += ts) {
        ctx.drawImage(img, wx - cam.x, wy - cam.y, ts, ts);
      }
    }
    ctx.imageSmoothingEnabled = false;
    ctx.restore();
  }

  private renderSprites(
    ctx: CanvasRenderingContext2D,
    cam: CameraController,
    objects: SpriteObject[],
    size: number,
    smooth = true,
  ): void {
    if (objects.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = smooth;
    for (const obj of objects) {
      const sx = obj.wx - cam.x;
      const sy = obj.wy - cam.y;
      if (sx + size < 0 || sx - size > cam.viewWidth || sy + size < 0 || sy - size > cam.viewHeight) continue;
      // Center sprite over tile, anchor bottom to bottom of tile row — round to avoid sub-pixel blur
      const drawX = Math.round(sx + TILE_SIZE / 2 - size / 2);
      const drawY = Math.round(sy + TILE_SIZE - size);
      ctx.drawImage(obj.img, drawX, drawY, size, size);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.restore();
  }

  private drawLayer(
    ctx: CanvasRenderingContext2D,
    cam: CameraController,
    layer: number[],
    yOffset = 0,
    grassUnderSprites = false,
  ): void {
    if (!this.map || !this.tileset) return;

    const { width, height } = this.map;
    const hasTexture = this.groundTextureImg !== null;

    const startTX = Math.max(0, Math.floor(cam.x / TILE_SIZE));
    const startTY = Math.max(0, Math.floor(cam.y / TILE_SIZE));
    const endTX = Math.min(width, Math.ceil((cam.x + cam.viewWidth) / TILE_SIZE));
    const endTY = Math.min(height, Math.ceil((cam.y + cam.viewHeight) / TILE_SIZE));

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const tileIndex = layer[ty * width + tx];
        if (!tileIndex) continue;

        // When ground texture is active, skip plain grass tiles — texture shows underneath
        if (hasTexture && GRASS_TILE_IDS.has(tileIndex)) continue;

        if (SPRITE_TILE_IDS.has(tileIndex)) {
          // Draw grass background under sprites only when there's no ground texture
          if (grassUnderSprites && !hasTexture) {
            ctx.drawImage(
              this.tileset,
              0, 0, TILE_SIZE, TILE_SIZE,
              tx * TILE_SIZE - cam.x, ty * TILE_SIZE - cam.y + yOffset, TILE_SIZE, TILE_SIZE,
            );
          }
          continue;
        }

        const srcX = ((tileIndex - 1) % TILESET_COLS) * TILE_SIZE;
        const srcY = Math.floor((tileIndex - 1) / TILESET_COLS) * TILE_SIZE;

        ctx.drawImage(
          this.tileset,
          srcX, srcY, TILE_SIZE, TILE_SIZE,
          tx * TILE_SIZE - cam.x, ty * TILE_SIZE - cam.y + yOffset, TILE_SIZE, TILE_SIZE,
        );
      }
    }
  }
}

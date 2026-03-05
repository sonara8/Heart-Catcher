import { TILE_SIZE } from './CollisionMap';

/**
 * CameraController — lerp follow-cam with pixel-perfect clamping.
 * Converts world coordinates to screen coordinates for all rendering.
 */
export class CameraController {
  x = 0;
  y = 0;

  private targetX = 0;
  private targetY = 0;
  private mapPixelWidth = 0;
  private mapPixelHeight = 0;

  readonly viewWidth = 320;
  readonly viewHeight = 240;

  private lerpSpeed = 0.12;

  setBounds(mapTileWidth: number, mapTileHeight: number): void {
    this.mapPixelWidth = mapTileWidth * TILE_SIZE;
    this.mapPixelHeight = mapTileHeight * TILE_SIZE;
  }

  follow(worldX: number, worldY: number): void {
    this.targetX = worldX - this.viewWidth / 2;
    this.targetY = worldY - this.viewHeight / 2;
  }

  update(_dt: number): void {
    // Lerp camera toward target
    this.x += (this.targetX - this.x) * this.lerpSpeed;
    this.y += (this.targetY - this.y) * this.lerpSpeed;

    // Clamp to world bounds
    this.x = Math.max(0, Math.min(this.x, this.mapPixelWidth - this.viewWidth));
    this.y = Math.max(0, Math.min(this.y, this.mapPixelHeight - this.viewHeight));

    // Round to integer to prevent sub-pixel jitter that destroys pixel art
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
  }

  /** Convert world position to screen position */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.round(worldX - this.x),
      y: Math.round(worldY - this.y),
    };
  }

  /** Convert screen position to world position */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.x,
      y: screenY + this.y,
    };
  }

  /** Snap camera immediately (e.g. on level load) */
  snapTo(worldX: number, worldY: number): void {
    this.x = Math.round(Math.max(0, Math.min(
      worldX - this.viewWidth / 2,
      this.mapPixelWidth - this.viewWidth,
    )));
    this.y = Math.round(Math.max(0, Math.min(
      worldY - this.viewHeight / 2,
      this.mapPixelHeight - this.viewHeight,
    )));
    this.targetX = this.x;
    this.targetY = this.y;
  }
}

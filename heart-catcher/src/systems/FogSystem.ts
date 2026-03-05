import type { TilePos } from '../data/types';
import type { AudioEngine } from '../engine/AudioEngine';
import { tileToWorld, TILE_SIZE } from './CollisionMap';
import type { CollisionMap } from './CollisionMap';
import type { AssetLoader } from '../engine/AssetLoader';

/**
 * FogSystem — Winter mechanics.
 * Snow tiles: overlay sprites that must be shoveled (Z while facing) to reveal.
 * Fog: dark overlay with circular visibility punch-out around player.
 */
export class FogSystem {
  private snowTiles = new Map<string, { shoveled: boolean; anim: number; animTimer: number }>();
  private fogEnabled = false;

  constructor(
    private readonly assets: AssetLoader,
    private readonly audio: AudioEngine,
    private readonly collision: CollisionMap,
  ) {}

  init(snowTiles: TilePos[], fogEnabled: boolean): void {
    this.snowTiles.clear();
    this.fogEnabled = fogEnabled;

    for (const pos of snowTiles) {
      this.snowTiles.set(this.posKey(pos), { shoveled: false, anim: 0, animTimer: 0 });
      // Block walkability until shoveled (snow drifts block path)
      this.collision.setWalkable(pos.tx, pos.ty, false);
    }
  }

  private posKey(pos: TilePos): string {
    return `${pos.tx},${pos.ty}`;
  }

  isSnowTile(tile: TilePos): boolean {
    const state = this.snowTiles.get(this.posKey(tile));
    return !!state && !state.shoveled;
  }

  shovel(tile: TilePos): boolean {
    const state = this.snowTiles.get(this.posKey(tile));
    if (!state || state.shoveled) return false;

    state.shoveled = true;
    state.anim = 1;
    this.audio.playSFX('shovel', 0.7);
    // Re-enable walkability
    this.collision.setWalkable(tile.tx, tile.ty, true);
    return true;
  }

  update(dt: number): void {
    for (const state of this.snowTiles.values()) {
      if (state.anim > 0) {
        state.animTimer += dt;
        if (state.animTimer > 0.5) {
          state.anim = 0; // animation done
        }
      }
    }
  }

  renderSnow(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sheet = this.assets.getImage('snow-shovel');

    for (const [key, state] of this.snowTiles) {
      if (state.shoveled && state.anim === 0) continue;

      const [tx, ty] = key.split(',').map(Number);
      const wx = tx * TILE_SIZE - camX;
      const wy = ty * TILE_SIZE - camY;

      if (sheet) {
        const frame = state.shoveled ? 2 : 0;
        ctx.drawImage(sheet, frame * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE, wx, wy, TILE_SIZE, TILE_SIZE);
      } else {
        // Placeholder: light blue snow overlay
        ctx.fillStyle = `rgba(200,230,255,${state.shoveled ? 0.3 : 0.7})`;
        ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  renderFog(ctx: CanvasRenderingContext2D, playerScreenX: number, playerScreenY: number): void {
    if (!this.fogEnabled) return;

    ctx.save();
    // Dark fog overlay
    ctx.fillStyle = 'rgba(5,5,20,0.72)';
    ctx.fillRect(0, 0, 320, 240);

    // Punch out circular visibility around player
    ctx.globalCompositeOperation = 'destination-out';
    const radius = 72;
    const gradient = ctx.createRadialGradient(
      playerScreenX, playerScreenY, radius * 0.4,
      playerScreenX, playerScreenY, radius,
    );
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

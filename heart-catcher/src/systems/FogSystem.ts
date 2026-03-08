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
  private fogPunchOut = true;
  private fogCanvas: HTMLCanvasElement | null = null;
  private fogCtx: CanvasRenderingContext2D | null = null;

  constructor(
    private readonly assets: AssetLoader,
    private readonly audio: AudioEngine,
    private readonly collision: CollisionMap,
  ) {}

  init(snowTiles: TilePos[], fogEnabled: boolean, fogPunchOut = true): void {
    this.snowTiles.clear();
    this.fogEnabled = fogEnabled;
    this.fogPunchOut = fogPunchOut;

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
    const pile = this.assets.getImage('snow-pile');

    // Drawn size: 20×20, centered on tile
    const DST = 20;
    const offset = (TILE_SIZE - DST) / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (const [key, state] of this.snowTiles) {
      if (state.shoveled && state.anim === 0) continue;

      const [tx, ty] = key.split(',').map(Number);
      const wx = tx * TILE_SIZE - camX;
      const wy = ty * TILE_SIZE - camY;

      // Fade out when shoveled (animTimer runs 0→0.5)
      const alpha = state.shoveled ? Math.max(0, 1 - state.animTimer / 0.5) : 1;
      ctx.globalAlpha = alpha;

      if (pile) {
        ctx.drawImage(pile, 0, 0, 1792, 1792, wx + offset, wy + offset, DST, DST);
      } else {
        ctx.fillStyle = `rgba(200,230,255,${alpha * 0.7})`;
        ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  renderFog(ctx: CanvasRenderingContext2D, playerScreenX: number, playerScreenY: number): void {
    if (!this.fogEnabled) return;

    // Lazily create offscreen canvas so destination-out only erases the fog layer,
    // not the main canvas (which would make the player invisible).
    if (!this.fogCanvas) {
      this.fogCanvas = document.createElement('canvas');
      this.fogCanvas.width = 320;
      this.fogCanvas.height = 240;
      this.fogCtx = this.fogCanvas.getContext('2d');
    }
    const oc = this.fogCtx!;

    // Fill offscreen canvas with dark fog
    oc.clearRect(0, 0, 320, 240);
    oc.fillStyle = 'rgba(5,5,20,0.85)';
    oc.fillRect(0, 0, 320, 240);

    // Optionally punch circular hole around player
    if (this.fogPunchOut) {
      oc.globalCompositeOperation = 'destination-out';
      const radius = 72;
      const gradient = oc.createRadialGradient(
        playerScreenX, playerScreenY, radius * 0.4,
        playerScreenX, playerScreenY, radius,
      );
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      oc.fillStyle = gradient;
      oc.beginPath();
      oc.arc(playerScreenX, playerScreenY, radius, 0, Math.PI * 2);
      oc.fill();
      oc.globalCompositeOperation = 'source-over';
    }

    // Composite fog layer onto main canvas — game world shows through the hole
    ctx.drawImage(this.fogCanvas, 0, 0);
  }
}

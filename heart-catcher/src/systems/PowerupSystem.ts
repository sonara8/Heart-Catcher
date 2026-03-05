import { PowerupType } from '../data/types';
import type { PowerupConfig, TilePos } from '../data/types';
import type { AssetLoader } from '../engine/AssetLoader';
import type { AudioEngine } from '../engine/AudioEngine';
import type { HeartManager } from './HeartManager';
import { tileToWorld, TILE_SIZE, distance } from './CollisionMap';
import { EventBus } from '../engine/EventBus';

interface PowerupSprite {
  config: PowerupConfig;
  worldX: number;
  worldY: number;
  collected: boolean;
  bobTimer: number;
}

const POWERUP_COLORS: Record<PowerupType, string> = {
  [PowerupType.RunningShoes]: '#f9a826',
  [PowerupType.SweetScent]: '#c678dd',
  [PowerupType.Mower]: '#56b6c2',
  [PowerupType.MemoryFragment]: '#ffd700',
};

/**
 * PowerupSystem — walk-over collection, inventory, and activation.
 */
export class PowerupSystem {
  private sprites: PowerupSprite[] = [];
  private inventory = new Map<PowerupType, number>();

  // Active states
  private runningActive = false;
  private sweetScentTimer = 0;
  private sweetScentTiles: TilePos[] = [];
  private sweetScentGlow = 0;
  private mowerActive = false;

  constructor(
    private readonly assets: AssetLoader,
    private readonly audio: AudioEngine,
    private readonly heartManager: HeartManager,
  ) {}

  init(configs: PowerupConfig[]): void {
    this.sprites = configs.map(cfg => ({
      config: cfg,
      worldX: tileToWorld(cfg.pos.tx),
      worldY: tileToWorld(cfg.pos.ty),
      collected: false,
      bobTimer: Math.random() * Math.PI * 2,
    }));
    this.inventory.clear();
    this.runningActive = false;
    this.sweetScentTimer = 0;
    this.sweetScentTiles = [];
    this.mowerActive = false;
  }

  update(dt: number, playerX: number, playerY: number, isRunDown: boolean): void {
    // Check walk-over collection
    for (const sprite of this.sprites) {
      if (sprite.collected) continue;
      if (distance(playerX, playerY, sprite.worldX, sprite.worldY) < TILE_SIZE * 0.8) {
        this.collect(sprite);
      }
      sprite.bobTimer += dt * 3;
    }

    // Running shoes — active while key held
    this.runningActive = isRunDown && this.has(PowerupType.RunningShoes);

    // Sweet scent countdown
    if (this.sweetScentTimer > 0) {
      this.sweetScentTimer -= dt;
      this.sweetScentGlow = Math.sin(Date.now() / 150) * 0.3 + 0.7;
      if (this.sweetScentTimer <= 0) {
        this.sweetScentTiles = [];
      }
    }
  }

  private collect(sprite: PowerupSprite): void {
    sprite.collected = true;
    const type = sprite.config.type;

    if (type === PowerupType.MemoryFragment) {
      EventBus.emit('show-memory', { photoIndex: sprite.config.photoIndex ?? 0 });
    } else {
      const current = this.inventory.get(type) ?? 0;
      this.inventory.set(type, current + 1);
    }

    this.audio.playSFX('powerup', 0.8);
    EventBus.emit('powerup-collected', { type });
  }

  activateSweetScent(playerX: number, playerY: number): boolean {
    if (!this.has(PowerupType.SweetScent)) return false;
    const count = this.inventory.get(PowerupType.SweetScent)!;
    this.inventory.set(PowerupType.SweetScent, count - 1);

    this.sweetScentTiles = this.heartManager.getNearbyHearts(playerX, playerY, 5);
    this.sweetScentTimer = 3;
    this.audio.playSFX('sweet-scent', 0.8);
    return true;
  }

  activateMower(): boolean {
    if (!this.has(PowerupType.Mower)) return false;
    this.mowerActive = !this.mowerActive;
    return true;
  }

  useMower(centerTile: TilePos): void {
    if (!this.mowerActive) return;
    const count = this.inventory.get(PowerupType.Mower)!;
    this.inventory.set(PowerupType.Mower, count - 1);
    this.mowerActive = false;

    // Reveal all hearts in 3x3 area
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tile: TilePos = { tx: centerTile.tx + dx, ty: centerTile.ty + dy };
        this.heartManager.interact(tile);
      }
    }
    this.audio.playSFX('grass-rustle', 0.9);
  }

  has(type: PowerupType): boolean {
    return (this.inventory.get(type) ?? 0) > 0;
  }

  get isRunning(): boolean { return this.runningActive; }
  get isMowerActive(): boolean { return this.mowerActive; }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sheet = this.assets.getImage('powerup-icons');

    for (const sprite of this.sprites) {
      if (sprite.collected) continue;
      const bob = Math.sin(sprite.bobTimer) * 2;
      const sx = Math.round(sprite.worldX - camX) - 8;
      const sy = Math.round(sprite.worldY - camY - bob) - 8;

      if (sheet) {
        const typeIndex = Object.values(PowerupType).indexOf(sprite.config.type);
        ctx.drawImage(sheet, typeIndex * 16, 0, 16, 16, sx, sy, 16, 16);
      } else {
        // Placeholder colored square
        ctx.fillStyle = POWERUP_COLORS[sprite.config.type];
        ctx.fillRect(sx, sy, 12, 12);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, 12, 12);
      }
    }

    // Sweet Scent glow on nearby hearts
    if (this.sweetScentTimer > 0) {
      for (const tile of this.sweetScentTiles) {
        const wx = tileToWorld(tile.tx);
        const wy = tileToWorld(tile.ty);
        const sx = Math.round(wx - camX);
        const sy = Math.round(wy - camY);
        ctx.globalAlpha = this.sweetScentGlow * 0.6;
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(sx - 8, sy - 8, 16, 16);
        ctx.globalAlpha = 1;
      }
    }
  }

  get inventorySnapshot(): Map<PowerupType, number> {
    return new Map(this.inventory);
  }
}

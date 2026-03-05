import type { DecoyConfig, TilePos } from '../data/types';
import type { AudioEngine } from '../engine/AudioEngine';
import type { AssetLoader } from '../engine/AssetLoader';
import { AnimationController } from './AnimationController';
import { tileToWorld } from './CollisionMap';
import { EventBus } from '../engine/EventBus';

interface SosoGiggle {
  x: number;
  y: number;
  alpha: number;
  timer: number;
  anim: AnimationController;
}

/**
 * DecoySystem — Autumn red berry decoys.
 * When interacted with, a Soso giggle sprite pops up and fades.
 * Emits 'decoy-triggered' which causes Master Catcher stamp to be withheld.
 */
export class DecoySystem {
  private decoys = new Set<string>();
  private giggles: SosoGiggle[] = [];

  constructor(
    private readonly assets: AssetLoader,
    private readonly audio: AudioEngine,
  ) {}

  init(configs: DecoyConfig[]): void {
    this.decoys.clear();
    this.giggles = [];
    for (const cfg of configs) {
      this.decoys.add(this.posKey(cfg.pos));
    }
  }

  private posKey(pos: TilePos): string {
    return `${pos.tx},${pos.ty}`;
  }

  /** Returns true if this tile is a decoy — call before HeartManager */
  isDecoy(tile: TilePos): boolean {
    return this.decoys.has(this.posKey(tile));
  }

  trigger(tile: TilePos): void {
    this.audio.playSFX('decoy-giggle', 0.8);
    EventBus.emit('decoy-triggered', {});

    const anim = new AnimationController();
    anim.define('peek', { frames: [0, 1, 2, 3, 2, 1, 0], fps: 8, loop: false });
    anim.play('peek');

    const wx = tileToWorld(tile.tx);
    const wy = tileToWorld(tile.ty);

    const giggle: SosoGiggle = {
      x: wx,
      y: wy - 16,
      alpha: 1,
      timer: 1.2,
      anim,
    };
    this.giggles.push(giggle);
  }

  update(dt: number): void {
    for (const g of this.giggles) {
      g.timer -= dt;
      g.anim.update(dt);
      if (g.timer < 0.3) {
        g.alpha = Math.max(0, g.timer / 0.3);
      }
    }
    this.giggles = this.giggles.filter(g => g.timer > 0);
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sheet = this.assets.getImage('soso-giggle');
    if (!sheet) {
      // Placeholder: pink circle
      for (const g of this.giggles) {
        ctx.globalAlpha = g.alpha;
        ctx.fillStyle = '#ff6b9d';
        ctx.fillRect(Math.round(g.x - camX) - 8, Math.round(g.y - camY) - 8, 16, 16);
        ctx.globalAlpha = 1;
      }
      return;
    }

    const FW = 32, FH = 32;
    for (const g of this.giggles) {
      ctx.globalAlpha = g.alpha;
      const frame = g.anim.frame;
      const sx = Math.round(g.x - camX) - FW / 2;
      const sy = Math.round(g.y - camY) - FH / 2;
      ctx.drawImage(sheet, frame * FW, 0, FW, FH, sx, sy, FW, FH);
    }
    ctx.globalAlpha = 1;
  }
}

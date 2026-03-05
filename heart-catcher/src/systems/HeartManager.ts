import type { HeartConfig, TilePos } from '../data/types';
import { HeartType } from '../data/types';
import type { AssetLoader } from '../engine/AssetLoader';
import type { TweenEngine } from '../engine/TweenEngine';
import type { ParticleEmitter } from './ParticleEmitter';
import type { AudioEngine } from '../engine/AudioEngine';
import type { CollisionMap } from './CollisionMap';
import { tileToWorld, TILE_SIZE, distance } from './CollisionMap';
import { AnimationController } from './AnimationController';
import { Easing } from '../engine/TweenEngine';
import { EventBus } from '../engine/EventBus';

interface HeartState {
  config: HeartConfig;
  currentPos: TilePos;
  found: boolean;
  scaleX: number;
  scaleY: number;
  visible: boolean;
  alpha: number;
  grassAnimTimer: number;
  showGrassAnim: boolean;
  moveTimer: number;
  grassAnim: AnimationController;
}

export class HeartManager {
  private hearts = new Map<string, HeartState>();
  private foundCount = 0;
  private requiredCount = 0;
  private levelComplete = false;

  constructor(
    private readonly assets: AssetLoader,
    private readonly tweens: TweenEngine,
    private readonly particles: ParticleEmitter,
    private readonly audio: AudioEngine,
    private readonly collision: CollisionMap,
  ) {}

  initLevel(configs: HeartConfig[], required: number): void {
    this.hearts.clear();
    this.foundCount = 0;
    this.requiredCount = required;
    this.levelComplete = false;

    for (const cfg of configs) {
      const key = this.posKey(cfg.pos);
      const state: HeartState = {
        config: { ...cfg },
        currentPos: { ...cfg.pos },
        found: false,
        scaleX: 1, scaleY: 1,
        visible: false,
        alpha: 1,
        grassAnimTimer: 0,
        showGrassAnim: false,
        moveTimer: 0,
        grassAnim: this.makeGrassAnim(),
      };
      this.hearts.set(key, state);
    }
  }

  private makeGrassAnim(): AnimationController {
    const a = new AnimationController();
    a.define('rustle', { frames: [0, 1, 2, 1, 0], fps: 12, loop: false });
    return a;
  }

  private posKey(pos: TilePos): string {
    return `${pos.tx},${pos.ty}`;
  }

  /** Called when player presses interact on a tile */
  interact(tile: TilePos): boolean {
    const key = this.posKey(tile);
    const heart = this.hearts.get(key);

    // Trigger grass rustle regardless
    this.triggerGrassRustle(tile);

    if (!heart || heart.found) return false;

    this.revealHeart(heart, key);
    return true;
  }

  private triggerGrassRustle(tile: TilePos): void {
    // Visual feedback is handled in render via grassAnim on hearts at this tile
    // Also applies to empty grass (no heart here)
    const key = this.posKey(tile);
    const heart = this.hearts.get(key);
    if (heart) {
      heart.showGrassAnim = true;
      heart.grassAnim.play('rustle', true);
      heart.grassAnim.onComplete = () => { heart.showGrassAnim = false; };
    }
    this.audio.playSFX('grass-rustle', 0.5);
  }

  private revealHeart(heart: HeartState, key: string): void {
    heart.found = true;
    heart.visible = true;
    heart.scaleX = 0;
    heart.scaleY = 0;

    // Remove from position map
    this.hearts.delete(key);
    // Store under a "found" key so it can still be rendered while animating
    this.hearts.set(`found-${key}`, heart);

    // Pop-up tween: scale 0 → 1.3 → 1.0
    const obj = { s: 0 };
    this.tweens.tween({
      target: obj, prop: 's', from: 0, to: 1.3,
      duration: 0.15, easing: Easing.easeOutQuad,
      onUpdate: v => { heart.scaleX = v; heart.scaleY = v; },
      onComplete: () => {
        this.tweens.tween({
          target: obj, prop: 's', from: 1.3, to: 1.0,
          duration: 0.1, easing: Easing.easeInQuad,
          onUpdate: v => { heart.scaleX = v; heart.scaleY = v; },
          onComplete: () => {
            // Fade out after a moment
            this.tweens.tween({
              target: heart, prop: 'alpha', from: 1, to: 0,
              duration: 0.5, delay: 0.3, easing: Easing.linear,
            });
          },
        });
      },
    });

    // Particles + audio
    const wx = tileToWorld(heart.currentPos.tx);
    const wy = tileToWorld(heart.currentPos.ty);
    this.particles.sparkle(wx, wy);
    this.audio.playSFX('heart-find');

    this.foundCount++;
    EventBus.emit('heart-found', { found: this.foundCount, required: this.requiredCount });

    if (this.foundCount >= this.requiredCount && !this.levelComplete) {
      this.levelComplete = true;
      setTimeout(() => EventBus.emit('level-complete', {}), 1500);
    }
  }

  /** Returns all active (unfound) heart world positions for compass */
  getActiveHeartPositions(): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    for (const [key, heart] of this.hearts) {
      if (!heart.found && !key.startsWith('found-')) {
        positions.push({
          x: tileToWorld(heart.currentPos.tx),
          y: tileToWorld(heart.currentPos.ty),
        });
      }
    }
    return positions;
  }

  /** Get hearts within tileRadius of a position (for Sweet Scent powerup) */
  getNearbyHearts(worldX: number, worldY: number, tileRadius: number): TilePos[] {
    const maxDist = tileRadius * TILE_SIZE;
    const result: TilePos[] = [];
    for (const [key, heart] of this.hearts) {
      if (heart.found || key.startsWith('found-')) continue;
      const hx = tileToWorld(heart.currentPos.tx);
      const hy = tileToWorld(heart.currentPos.ty);
      if (distance(worldX, worldY, hx, hy) <= maxDist) {
        result.push({ ...heart.currentPos });
      }
    }
    return result;
  }

  update(dt: number, playerWorldX: number, playerWorldY: number): void {
    for (const [key, heart] of this.hearts) {
      if (key.startsWith('found-')) {
        heart.grassAnim.update(dt);
        continue;
      }
      if (heart.found) continue;

      heart.grassAnim.update(dt);

      // Moving hearts (Summer)
      if (heart.config.moveDelayMs && heart.config.moveDelayMs > 0) {
        heart.moveTimer += dt * 1000;
        if (heart.moveTimer >= heart.config.moveDelayMs) {
          heart.moveTimer = 0;
          const hx = tileToWorld(heart.currentPos.tx);
          const hy = tileToWorld(heart.currentPos.ty);
          const dist = distance(playerWorldX, playerWorldY, hx, hy);
          if (dist < 3 * TILE_SIZE) {
            this.moveHeart(heart, key);
          }
        }
      }
    }
  }

  private moveHeart(heart: HeartState, oldKey: string): void {
    const neighbors = this.collision.walkableNeighbors(heart.currentPos);
    if (neighbors.length === 0) return;

    // Exclude tiles that already have a heart
    const available = neighbors.filter(n => !this.hearts.has(this.posKey(n)));
    if (available.length === 0) return;

    const newPos = available[Math.floor(Math.random() * available.length)];
    this.hearts.delete(oldKey);
    heart.currentPos = { ...newPos };
    this.hearts.set(this.posKey(newPos), heart);
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sheet = this.assets.getImage('heart-normal');
    const grassSheet = this.assets.getImage('grass-rustle');
    const FRAME_W = 16, FRAME_H = 16;

    for (const [key, heart] of this.hearts) {
      const isFound = key.startsWith('found-');

      // Grass rustle animation on the tile
      if (heart.showGrassAnim && grassSheet) {
        const frame = heart.grassAnim.frame;
        const wx = tileToWorld(heart.currentPos.tx);
        const wy = tileToWorld(heart.currentPos.ty);
        const sx = Math.round(wx - camX) - FRAME_W / 2;
        const sy = Math.round(wy - camY) - FRAME_H / 2;
        const srcX = frame * FRAME_W;
        ctx.drawImage(grassSheet, srcX, 0, FRAME_W, FRAME_H, sx, sy, FRAME_W, FRAME_H);
      }

      // Revealed heart sprite
      if (isFound && heart.visible && heart.alpha > 0 && sheet) {
        const wx = tileToWorld(heart.currentPos.tx);
        const wy = tileToWorld(heart.currentPos.ty);
        const sx = Math.round(wx - camX);
        const sy = Math.round(wy - camY);
        ctx.save();
        ctx.globalAlpha = heart.alpha;
        ctx.translate(sx, sy);
        ctx.scale(heart.scaleX, heart.scaleY);
        const frameRow = heart.config.type === HeartType.Golden ? 1 : 0;
        ctx.drawImage(
          sheet,
          0, frameRow * FRAME_H, FRAME_W, FRAME_H,
          -FRAME_W / 2, -FRAME_H / 2, FRAME_W, FRAME_H,
        );
        ctx.restore();
      }
    }
  }

  get foundHearts(): number { return this.foundCount; }
  get totalHearts(): number { return this.requiredCount; }
  get isComplete(): boolean { return this.levelComplete; }
}

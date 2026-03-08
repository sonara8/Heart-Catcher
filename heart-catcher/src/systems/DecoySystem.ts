import type { DecoyConfig, TilePos } from '../data/types';
import type { AudioEngine } from '../engine/AudioEngine';
import type { AssetLoader } from '../engine/AssetLoader';
import { AnimationController } from './AnimationController';
import { tileToWorld } from './CollisionMap';
import { EventBus } from '../engine/EventBus';

// Easing helpers
function easeOutBack(t: number): number {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function easeInCubic(t: number): number {
  return t * t * t;
}

interface SosoGiggle {
  x: number;
  y: number;         // base Y (world space)
  floatY: number;    // additional upward offset (screen px, increases over time)
  alpha: number;
  scale: number;
  timer: number;
  totalTime: number;
  anim: AnimationController;
}

/** Berry pop-up that scales in with a springy ease, then fades. */
interface BerryReveal {
  x: number;
  y: number;
  scale: number;
  alpha: number;
  timer: number;
  totalTime: number;
}

/**
 * DecoySystem — Autumn red berry decoys, hidden in grass.
 * On interact: berry pops up smoothly → Soso floats in giggling → both fade.
 */
export class DecoySystem {
  private decoys = new Set<string>();
  private berryReveals: BerryReveal[] = [];
  private giggles: SosoGiggle[] = [];

  constructor(
    private readonly assets: AssetLoader,
    private readonly audio: AudioEngine,
  ) {}

  init(configs: DecoyConfig[]): void {
    this.decoys.clear();
    this.berryReveals = [];
    this.giggles = [];
    for (const cfg of configs) {
      this.decoys.add(this.posKey(cfg.pos));
    }
  }

  private posKey(pos: TilePos): string {
    return `${pos.tx},${pos.ty}`;
  }

  isDecoy(tile: TilePos): boolean {
    return this.decoys.has(this.posKey(tile));
  }

  trigger(tile: TilePos): void {
    this.audio.playSFX('decoy-giggle', 0.8);
    EventBus.emit('decoy-triggered', {});

    const wx = tileToWorld(tile.tx);
    const wy = tileToWorld(tile.ty);

    this.berryReveals.push({ x: wx, y: wy, scale: 0, alpha: 0, timer: 1.1, totalTime: 1.1 });

    const anim = new AnimationController();
    anim.define('peek', { frames: [0, 1, 2, 3, 2, 1, 0], fps: 8, loop: false });
    anim.play('peek');
    // Giggle lives for 1.8s total; starts entering at 0.25s after trigger
    this.giggles.push({ x: wx, y: wy - 8, floatY: 0, alpha: 0, scale: 0, timer: 1.8, totalTime: 1.8, anim });
  }

  update(dt: number): void {
    // ── Berry reveal ──────────────────────────────────────────────────────────
    for (const b of this.berryReveals) {
      b.timer -= dt;
      const elapsed = b.totalTime - b.timer;
      const t = Math.min(elapsed / b.totalTime, 1);

      // Scale: easeOutBack gives a satisfying overshoot spring feel
      const scalePhase = Math.min(elapsed / 0.22, 1);
      b.scale = easeOutBack(scalePhase);

      // Alpha: fade in quickly, hold, then fade out over last 0.35s
      if (elapsed < 0.12) {
        b.alpha = elapsed / 0.12; // fast fade-in
      } else if (b.timer > 0.35) {
        b.alpha = 1;
      } else {
        b.alpha = Math.max(0, easeInCubic(b.timer / 0.35));
      }
      void t;
    }
    this.berryReveals = this.berryReveals.filter(b => b.timer > 0);

    // ── Soso giggle ───────────────────────────────────────────────────────────
    for (const g of this.giggles) {
      g.timer -= dt;
      g.anim.update(dt);
      const elapsed = g.totalTime - g.timer;

      // Float upward gently (max 10px over first 0.8s)
      g.floatY = Math.min(elapsed / 0.8, 1) * 12;

      const ENTER_START = 0.25;  // delay before Soso starts appearing
      const ENTER_DUR   = 0.28;  // how long the entrance takes
      const FADE_START  = 0.5;   // remaining timer when fade-out begins

      if (elapsed < ENTER_START) {
        g.alpha = 0;
        g.scale = 0;
      } else {
        const enterT = Math.min((elapsed - ENTER_START) / ENTER_DUR, 1);
        // Scale: easeOutBack springs in from 0 to 1
        g.scale = easeOutBack(enterT);
        // Alpha: smooth cubic fade-in
        const alphaIn = easeOutCubic(enterT);
        if (g.timer > FADE_START) {
          g.alpha = alphaIn;
        } else {
          // Fade out: multiply by fade-out fraction
          const fadeOut = easeInCubic(Math.max(0, g.timer / FADE_START));
          g.alpha = alphaIn * fadeOut;
        }
      }
    }
    this.giggles = this.giggles.filter(g => g.timer > 0);
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const berryImg = this.assets.getImage('berry-decoy');
    const BERRY_SIZE = 26;
    const BERRY_HALF = BERRY_SIZE / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    // ── Berry pop-ups ─────────────────────────────────────────────────────────
    for (const b of this.berryReveals) {
      if (b.alpha <= 0 || b.scale <= 0) continue;
      const cx = Math.round(b.x - camX + 8);
      const cy = Math.round(b.y - camY + 8);

      // Glow ring (scales with berry)
      ctx.globalAlpha = b.alpha * 0.45;
      ctx.fillStyle = '#cc44aa';
      ctx.beginPath();
      ctx.arc(cx, cy, (BERRY_HALF + 5) * b.scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = b.alpha;
      ctx.translate(cx, cy);
      ctx.scale(b.scale, b.scale);
      if (berryImg) {
        ctx.drawImage(berryImg, -BERRY_HALF, -BERRY_HALF, BERRY_SIZE, BERRY_SIZE);
      } else {
        ctx.fillStyle = '#cc44aa';
        ctx.fillRect(-BERRY_HALF, -BERRY_HALF, BERRY_SIZE, BERRY_SIZE);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
    }

    // ── Soso giggle ───────────────────────────────────────────────────────────
    const sheet = this.assets.getImage('soso-giggle');
    const SRC_FW = 1792, SRC_FH = 2390;
    const DST_W = 32, DST_H = 43;

    for (const g of this.giggles) {
      if (g.alpha <= 0 || g.scale <= 0) continue;

      const cx = Math.round(g.x - camX);
      const cy = Math.round(g.y - camY - g.floatY);

      ctx.globalAlpha = g.alpha;
      ctx.translate(cx, cy);
      ctx.scale(g.scale, g.scale);

      if (sheet) {
        const frame = g.anim.frame;
        ctx.drawImage(sheet, frame * SRC_FW, 0, SRC_FW, SRC_FH, -DST_W / 2, -DST_H, DST_W, DST_H);
      } else {
        ctx.fillStyle = '#ff6b9d';
        ctx.fillRect(-8, -16, 16, 16);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

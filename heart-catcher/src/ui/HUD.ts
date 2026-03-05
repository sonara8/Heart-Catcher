import type { CompassSystem } from '../systems/CompassSystem';
import type { PowerupSystem } from '../systems/PowerupSystem';
import { PowerupType } from '../data/types';

const POWERUP_LABELS: Record<PowerupType, string> = {
  [PowerupType.RunningShoes]: 'RUN',
  [PowerupType.SweetScent]: 'SNT',
  [PowerupType.Mower]: 'MOW',
  [PowerupType.MemoryFragment]: 'MEM',
};

const POWERUP_KEY_HINTS: Partial<Record<PowerupType, string>> = {
  [PowerupType.RunningShoes]: 'SHF',
  [PowerupType.SweetScent]: '[Q]',
  [PowerupType.Mower]: '[E]',
};

/**
 * HUD — drawn on canvas after GameScene.
 * Heart counter top-left, compass top-right, level name centered top, powerup slots bottom-right.
 */
export class HUD {
  private heartsFound = 0;
  private heartsTotal = 0;
  private levelName = '';

  setHearts(found: number, total: number): void {
    this.heartsFound = found;
    this.heartsTotal = total;
  }

  setLevelName(name: string): void {
    this.levelName = name;
  }

  render(
    ctx: CanvasRenderingContext2D,
    compass: CompassSystem,
    powerups: PowerupSystem,
  ): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // ── Heart counter (top-left) ──────────────────────────────────────
    this.drawPanel(ctx, 2, 2, 60, 14);
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(`♥ ${this.heartsFound}/${this.heartsTotal}`, 6, 12);

    // ── Level name (top-center) ───────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const nameW = this.levelName.length * 5 + 8;
    ctx.fillRect(160 - nameW / 2, 2, nameW, 11);
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.levelName, 160, 11);
    ctx.textAlign = 'left';

    // ── Compass (top-right) ───────────────────────────────────────────
    this.renderCompass(ctx, compass, 296, 14);

    // ── Powerup slots (bottom-right) ─────────────────────────────────
    const inventory = powerups.inventorySnapshot;
    const types = [PowerupType.RunningShoes, PowerupType.SweetScent, PowerupType.Mower, PowerupType.MemoryFragment];
    let slotX = 230;
    for (const type of types) {
      const count = inventory.get(type) ?? 0;
      if (count > 0) {
        this.drawPanel(ctx, slotX, 221, 22, 18);
        ctx.fillStyle = '#ffd700';
        ctx.font = '5px monospace';
        ctx.fillText(POWERUP_LABELS[type], slotX + 2, 230);
        const hint = POWERUP_KEY_HINTS[type];
        if (hint) {
          ctx.fillStyle = '#ffffff88';
          ctx.fillText(hint, slotX + 2, 236);
        }
        if (count > 1) {
          ctx.fillStyle = '#fff';
          ctx.font = '5px monospace';
          ctx.fillText(`×${count}`, slotX + 14, 230);
        }
        slotX += 24;
      }
    }

    ctx.restore();
  }

  private renderCompass(
    ctx: CanvasRenderingContext2D,
    compass: CompassSystem,
    cx: number,
    cy: number,
  ): void {
    const r = 8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(compass.scale, compass.scale);

    // Outer ring
    ctx.strokeStyle = compass.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = compass.isNearby ? compass.color : '#ffffff44';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Pulse ring
    if (compass.scale > 1.05) {
      ctx.globalAlpha = (compass.scale - 1) * 3;
      ctx.strokeStyle = compass.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
}

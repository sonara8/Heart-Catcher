import type { CompassSystem } from '../systems/CompassSystem';
import type { PowerupSystem } from '../systems/PowerupSystem';
import { PowerupType } from '../data/types';

const POWERUP_LABELS: Record<PowerupType, string> = {
  [PowerupType.RunningShoes]: 'RUN',
  [PowerupType.SweetScent]: 'SNT',
  [PowerupType.Mower]: 'MOW',
};

const POWERUP_KEY_HINTS: Partial<Record<PowerupType, string>> = {
  [PowerupType.RunningShoes]: 'SHF',
  [PowerupType.SweetScent]: '[Q]',
  [PowerupType.Mower]: '[E]',
};

/**
 * HUD — Pokémon BW2 style.
 * Top-right: "❤ Found: X / Y" pill + scrapbook icon.
 * Bottom: 6-slot inventory bar spanning full width.
 * Top-center: level name small text.
 * Bottom-right: compass.
 */
export class HUD {
  private heartsFound = 0;
  private heartsTotal = 0;
  private levelName = '';
  private heartSprite: HTMLImageElement | null = null;

  setHeartSprite(img: HTMLImageElement | null): void {
    this.heartSprite = img;
  }

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

    // ── Level name (small, top-center) ────────────────────────────────
    if (this.levelName) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      const nameW = ctx.measureText(this.levelName).width + 8;
      ctx.fillRect(Math.round(160 - nameW / 2), 2, nameW, 10);
      ctx.fillStyle = '#ffffffcc';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.levelName, 160, 10);
      ctx.textAlign = 'left';
    }

    // ── Heart counter pill (top-right) ─────────────────────────────────
    // Pill: dark rounded rect 84×14 at x=210 y=2
    this.drawPill(ctx, 210, 2, 84, 14);
    // Heart icon — use the in-game heart sprite if loaded, else canvas fallback
    if (this.heartSprite) {
      ctx.drawImage(this.heartSprite, 211, 2, 12, 12);
    } else {
      this.drawHeartIcon(ctx, 217, 8, '#ff6b9d');
    }
    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(`Found: ${this.heartsFound} / ${this.heartsTotal}`, 226, 12);

    // ── Bottom inventory bar ──────────────────────────────────────────
    // Dark panel 320×14 at y=226
    ctx.fillStyle = 'rgba(10,10,30,0.82)';
    ctx.fillRect(0, 226, 320, 14);
    ctx.strokeStyle = 'rgba(255,107,157,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 226.5, 319, 13);

    // 6 evenly spaced slots
    const types = [
      PowerupType.RunningShoes,
      PowerupType.SweetScent,
      PowerupType.Mower,
    ];
    const slotW = 18;
    const totalSlotsW = 6 * slotW + 5 * 2; // 6 slots + 5 gaps of 2px
    const startX = Math.round((320 - totalSlotsW) / 2);
    const inventory = powerups.inventorySnapshot;

    for (let i = 0; i < 6; i++) {
      const sx = startX + i * (slotW + 2);
      const sy = 228;
      // Slot background
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(sx, sy, slotW, 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx + 0.5, sy + 0.5, slotW - 1, 9);

      if (i < types.length) {
        const type = types[i];
        const count = inventory.get(type) ?? 0;
        if (count > 0) {
          const hint = POWERUP_KEY_HINTS[type];
          ctx.fillStyle = '#ffd700';
          ctx.font = '5px monospace';
          ctx.fillText(POWERUP_LABELS[type], sx + 1, sy + 7);
          if (hint) {
            ctx.fillStyle = '#ffffff66';
            ctx.font = '4px monospace';
            ctx.fillText(hint, sx + 1, sy + 7);
          }
          if (count > 1) {
            ctx.fillStyle = '#ffffffcc';
            ctx.font = '5px monospace';
            ctx.fillText(`${count}`, sx + slotW - 5, sy + 8);
          }
        }
      }
    }

    // ── Compass (bottom-right, above bar) ────────────────────────────
    this.renderCompass(ctx, compass, 305, 215);

    ctx.restore();
  }

  private drawHeartIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 1, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 2, cy - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 4.5, cy);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx + 4.5, cy);
    ctx.fill();
  }

  private drawBookIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.fillStyle = '#ffffffbb';
    // Book body
    ctx.fillRect(cx - 4, cy - 4, 8, 7);
    // Spine
    ctx.fillStyle = '#ff6b9daa';
    ctx.fillRect(cx - 1, cy - 4, 2, 7);
    // Pages hint
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(cx - 3, cy - 3, 6, 1);
    ctx.fillRect(cx - 3, cy - 1, 6, 1);
  }

  private drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const r = 3;
    ctx.fillStyle = 'rgba(10,10,30,0.88)';
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,107,157,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
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

    ctx.strokeStyle = compass.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = compass.isNearby ? compass.color : '#ffffff44';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

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
}

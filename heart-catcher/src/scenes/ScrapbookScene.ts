import type { Scene } from '../engine/SceneManager';
import type { SceneManager } from '../engine/SceneManager';
import type { InputManager } from '../engine/InputManager';
import type { AudioEngine } from '../engine/AudioEngine';
import type { SaveManager } from '../systems/SaveManager';
import { scrapbookEntries } from '../data/scrapbook/entries';
import type { ScrapbookEntry } from '../data/types';
import { EventBus } from '../engine/EventBus';

interface ScrapbookInitData {
  levelId: number;
  timeMs: number;
  heartsFound: number;
  masterCatcher: boolean;
  nextLevelId: number;
}

/**
 * ScrapbookScene — pushed over GameScene after level complete.
 * Shows Soso's personalized message with typewriter effect.
 * Navigate previous entries with arrow keys. Press Z/Space/Enter to continue.
 */
export class ScrapbookScene implements Scene {
  private data: ScrapbookInitData | null = null;
  private currentEntryIndex = 0;
  private unlockedEntries: ScrapbookEntry[] = [];
  private displayedChars = 0;
  private charTimer = 0;
  private readonly CHAR_RATE = 0.025;
  private pageAlpha = 0;
  private openTimer = 0;
  private readonly OPEN_DURATION = 0.6;

  constructor(
    private readonly sceneManager: SceneManager,
    private readonly input: InputManager,
    private readonly audio: AudioEngine,
    private readonly saveManager: SaveManager,
    private readonly gameSceneFactory: (levelId: number) => GameScene,
  ) {}

  init(rawData?: unknown): void {
    this.data = rawData as ScrapbookInitData;
    this.openTimer = 0;
    this.pageAlpha = 0;
    this.displayedChars = 0;
    this.charTimer = 0;

    // Save level progress
    if (this.data) {
      this.saveManager.completeLevel(
        this.data.levelId,
        this.data.timeMs,
        this.data.heartsFound,
        this.data.masterCatcher,
      );
    }

    // Collect all unlocked entries (all completed levels + current)
    this.unlockedEntries = scrapbookEntries.filter(e =>
      this.saveManager.isLevelComplete(e.levelId) ||
      (this.data && e.levelId === this.data.levelId),
    );

    // Show the entry for the current level
    const targetEntry = this.data
      ? this.unlockedEntries.find(e => e.levelId === this.data!.levelId)
      : null;
    this.currentEntryIndex = targetEntry
      ? this.unlockedEntries.indexOf(targetEntry)
      : this.unlockedEntries.length - 1;

    this.audio.playMusic('music-scrapbook', 1);
  }

  private get currentEntry(): ScrapbookEntry | null {
    return this.unlockedEntries[this.currentEntryIndex] ?? null;
  }

  update(dt: number): void {
    this.input.pollGamepad();
    this.openTimer = Math.min(this.openTimer + dt, this.OPEN_DURATION);
    this.pageAlpha = this.openTimer / this.OPEN_DURATION;

    // Typewriter effect
    const entry = this.currentEntry;
    if (entry && this.pageAlpha >= 1) {
      if (this.displayedChars < entry.message.length) {
        this.charTimer += dt;
        while (this.charTimer >= this.CHAR_RATE && this.displayedChars < entry.message.length) {
          this.charTimer -= this.CHAR_RATE;
          this.displayedChars++;
        }
      }
    }

    // Navigation
    if (this.input.isJustPressed('ArrowLeft', 'KeyA') && this.currentEntryIndex > 0) {
      this.currentEntryIndex--;
      this.resetTypewriter();
      this.audio.playSFX('page-turn', 0.6);
    }
    if (
      this.input.isJustPressed('ArrowRight', 'KeyD') &&
      this.currentEntryIndex < this.unlockedEntries.length - 1
    ) {
      this.currentEntryIndex++;
      this.resetTypewriter();
      this.audio.playSFX('page-turn', 0.6);
    }

    // Dismiss / advance
    if (this.input.isActionJustPressed()) {
      if (this.displayedChars < (this.currentEntry?.message.length ?? 0)) {
        // First press: reveal all
        this.displayedChars = this.currentEntry?.message.length ?? 0;
      } else {
        this.advance();
      }
    }

    this.input.flush();
  }

  private resetTypewriter(): void {
    this.displayedChars = 0;
    this.charTimer = 0;
  }

  private advance(): void {
    if (!this.data) {
      this.sceneManager.pop();
      return;
    }

    if (this.data.nextLevelId > 22) {
      // Game complete — just pop back
      EventBus.emit('game-complete', {});
      this.sceneManager.pop();
      return;
    }

    // Go to next level
    this.sceneManager.switch(this.gameSceneFactory(this.data.nextLevelId));
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Dark overlay behind scrapbook
    ctx.fillStyle = `rgba(5,5,20,${0.8 * this.pageAlpha})`;
    ctx.fillRect(0, 0, 320, 240);

    if (this.pageAlpha < 0.3) return;

    const a = Math.min(1, (this.pageAlpha - 0.3) / 0.7);
    ctx.globalAlpha = a;

    // Page background
    const px = 16, py = 12, pw = 288, ph = 216;
    ctx.fillStyle = '#fdf6e3';
    this.roundRect(ctx, px, py, pw, ph, 3);
    ctx.fill();
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    this.roundRect(ctx, px + 1, py + 1, pw - 2, ph - 2, 3);
    ctx.stroke();

    const entry = this.currentEntry;
    if (entry) {
      // Chapter title
      ctx.fillStyle = '#8b6914';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(entry.title, 160, py + 16);

      // Decorative divider
      ctx.strokeStyle = '#c8a97088';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 16, py + 21); ctx.lineTo(px + pw - 16, py + 21);
      ctx.stroke();

      // Message text (typewriter)
      ctx.fillStyle = '#3d2b1f';
      ctx.font = '6px monospace';
      ctx.textAlign = 'left';
      const displayed = entry.message.slice(0, this.displayedChars);
      this.drawWrappedText(ctx, displayed, px + 10, py + 32, pw - 20, 9);

      // Blinking cursor
      if (this.displayedChars >= entry.message.length) {
        const blink = Math.floor(Date.now() / 600) % 2;
        if (blink) {
          ctx.fillStyle = '#8b6914';
          ctx.font = '8px monospace';
          ctx.textAlign = 'right';
          ctx.fillText('▼ Press Z', px + pw - 8, py + ph - 8);
        }
      }

      // Page nav dots
      if (this.unlockedEntries.length > 1) {
        const dotY = py + ph - 5;
        const totalDots = Math.min(this.unlockedEntries.length, 22);
        const dotSpacing = 5;
        const startX = 160 - (totalDots * dotSpacing) / 2;
        for (let i = 0; i < totalDots; i++) {
          ctx.fillStyle = i === this.currentEntryIndex ? '#8b6914' : '#c8a97066';
          ctx.fillRect(startX + i * dotSpacing, dotY, 3, 3);
        }
      }

      // Level stats (small, bottom-left)
      const save = this.saveManager.getLevelSave(entry.levelId);
      if (save) {
        ctx.fillStyle = '#8b691488';
        ctx.font = '5px monospace';
        ctx.textAlign = 'left';
        const mins = Math.floor(save.bestTimeMs / 60000);
        const secs = Math.floor((save.bestTimeMs % 60000) / 1000);
        ctx.fillText(
          `Best: ${mins}:${String(secs).padStart(2,'0')} | ♥ ${save.heartsFound}`,
          px + 8, py + ph - 5,
        );
        if (save.masterCatcher) {
          ctx.fillStyle = '#ffd700';
          ctx.fillText('★ Master Catcher', px + 8, py + ph - 12);
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number, y: number,
    maxWidth: number, lineHeight: number,
  ): void {
    const lines = text.split('\n');
    let cy = y;
    for (const rawLine of lines) {
      if (rawLine === '') { cy += lineHeight; continue; }
      const words = rawLine.split(' ');
      let line = '';
      for (const word of words) {
        const test = line + (line ? ' ' : '') + word;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, x, cy);
          cy += lineHeight;
          line = word;
        } else { line = test; }
      }
      if (line) { ctx.fillText(line, x, cy); cy += lineHeight; }
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
    ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
    ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
    ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }

  destroy(): void {}
}

// Forward declaration to avoid circular import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GameScene = any;

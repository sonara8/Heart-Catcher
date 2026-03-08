import type { Scene } from '../engine/SceneManager';
import type { SceneManager } from '../engine/SceneManager';
import type { InputManager } from '../engine/InputManager';
import type { AudioEngine } from '../engine/AudioEngine';
import type { SaveManager } from '../systems/SaveManager';
import type { AssetLoader } from '../engine/AssetLoader';
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

interface Star { x: number; y: number; size: number; twinkle: number; speed: number; }
interface Confetti { x: number; y: number; vx: number; vy: number; color: string; rot: number; rspeed: number; size: number; }
interface PicRain { x: number; y: number; vx: number; vy: number; rot: number; rspeed: number; size: number; }

// Envelope grid layout constants
const COLS = 6;
const CELL_W = 46;
const CELL_H = 46;
const GRID_LEFT = (320 - COLS * CELL_W) / 2; // 22
const GRID_TOP = 34;

/**
 * ScrapbookScene — two modes:
 * 1. After-level (timeMs >= 0): page view with typewriter + level 22 The End animation.
 * 2. Browse (timeMs = -1, opened from main menu): 22 animated envelopes in a grid.
 *    Select with arrows, open with Z to read, Z again to close back to grid.
 */
export class ScrapbookScene implements Scene {
  private data: ScrapbookInitData | null = null;

  // ── After-level page mode ──
  private currentEntryIndex = 0;
  private unlockedEntries: ScrapbookEntry[] = [];
  private displayedChars = 0;
  private charTimer = 0;
  private readonly CHAR_RATE = 0.025;
  private pageAlpha = 0;
  private openTimer = 0;
  private readonly OPEN_DURATION = 0.6;

  // ── Browse / envelope grid mode ──
  private gridMode = false;
  private gridSelected = 0;  // 0–21 (level index)
  private gridState: 'grid' | 'opening' | 'reading' | 'closing' = 'grid';
  private gridAnimTimer = 0;
  private readonly ANIM_DUR = 0.28;
  private gridEntryDisplayed = 0;
  private gridEntryCharTimer = 0;
  private gridPageAlpha = 0;    // fade-in for letter page in grid reading mode
  private openedSet = new Set<number>(); // level IDs opened this session

  private birthdayCardTimer: ReturnType<typeof setTimeout> | null = null;

  // ── "The End" animation ──
  private theEndMode = false;
  private theEndTimer = 0;
  private theEndDisplayed = 0;
  private theEndCharTimer = 0;
  private readonly THE_END_TEXT = 'The End';
  private theEndStars: Star[] = [];
  private theEndConfetti: Confetti[] = [];
  private theEndPicRain: PicRain[] = [];
  private theEndCanDismiss = false;

  constructor(
    private readonly sceneManager: SceneManager,
    private readonly input: InputManager,
    private readonly audio: AudioEngine,
    private readonly saveManager: SaveManager,
    private readonly gameSceneFactory: (levelId: number) => GameScene,
    private readonly mainMenuFactory?: () => Scene,
    private readonly assets?: AssetLoader,
  ) {}

  init(rawData?: unknown): void {
    this.data = rawData as ScrapbookInitData;
    this.openTimer = 0;
    this.pageAlpha = 0;
    this.displayedChars = 0;
    this.charTimer = 0;
    this.theEndMode = false;
    this.theEndTimer = 0;
    this.theEndDisplayed = 0;
    this.theEndCharTimer = 0;
    this.theEndCanDismiss = false;
    this.theEndStars = [];
    this.theEndConfetti = [];
    this.theEndPicRain = [];

    // Save level progress (skip for browse mode: timeMs = -1)
    if (this.data && this.data.timeMs >= 0) {
      this.saveManager.completeLevel(
        this.data.levelId,
        this.data.timeMs,
        this.data.heartsFound,
        this.data.masterCatcher,
      );
    }

    // Collect unlocked entries
    this.unlockedEntries = scrapbookEntries.filter(e =>
      this.saveManager.isLevelComplete(e.levelId) ||
      (this.data && e.levelId === this.data.levelId),
    );

    // Browse mode — open from main menu
    this.gridMode = this.data?.timeMs === -1;
    if (this.gridMode) {
      this.gridState = 'grid';
      this.gridAnimTimer = 0;
      this.gridEntryDisplayed = 0;
      this.openedSet.clear();
      // Start on the last unlocked level
      this.gridSelected = Math.max(0, this.unlockedEntries.length - 1);
    } else {
      // After-level: show the entry for completed level
      const targetEntry = this.data
        ? this.unlockedEntries.find(e => e.levelId === this.data!.levelId)
        : null;
      this.currentEntryIndex = targetEntry
        ? this.unlockedEntries.indexOf(targetEntry)
        : this.unlockedEntries.length - 1;
    }

    if (this.data?.levelId === 22 && !this.gridMode) {
      this.birthdayCardTimer = setTimeout(() => {
        this.birthdayCardTimer = null;
        this.audio.playMusic('birthday-card', 0.5);
      }, 2000);
    } else if (!this.gridMode) {
      this.audio.playMusic('music-scrapbook', 1);
    }
    // Grid mode (opened from menu): keep whatever music is already playing
  }

  private get currentEntry(): ScrapbookEntry | null {
    return this.unlockedEntries[this.currentEntryIndex] ?? null;
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  update(dt: number): void {
    this.input.pollGamepad();

    if (this.theEndMode) {
      this.updateTheEnd(dt);
    } else if (this.gridMode) {
      this.updateGrid(dt);
    } else {
      this.updatePage(dt);
    }

    this.input.flush();
  }

  private updatePage(dt: number): void {
    this.openTimer = Math.min(this.openTimer + dt, this.OPEN_DURATION);
    this.pageAlpha = this.openTimer / this.OPEN_DURATION;

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

    if (this.input.isJustPressed('ArrowLeft', 'KeyA') && this.currentEntryIndex > 0) {
      this.currentEntryIndex--;
      this.resetTypewriter();
      this.audio.playSFX('page-turn', 0.6);
    }
    if (this.input.isJustPressed('ArrowRight', 'KeyD') &&
        this.currentEntryIndex < this.unlockedEntries.length - 1) {
      this.currentEntryIndex++;
      this.resetTypewriter();
      this.audio.playSFX('page-turn', 0.6);
    }

    if (this.input.isActionJustPressed()) {
      if (this.displayedChars < (this.currentEntry?.message.length ?? 0)) {
        this.displayedChars = this.currentEntry?.message.length ?? 0;
      } else {
        this.advance();
      }
    }
  }

  private updateGrid(dt: number): void {
    const totalEnvelopes = 22; // all levels, including locked ones

    if (this.gridState === 'grid') {
      // Navigation
      const prevSelected = this.gridSelected;
      if (this.input.isJustPressed('ArrowRight', 'KeyD')) {
        this.gridSelected = Math.min(this.gridSelected + 1, totalEnvelopes - 1);
      }
      if (this.input.isJustPressed('ArrowLeft', 'KeyA')) {
        this.gridSelected = Math.max(this.gridSelected - 1, 0);
      }
      if (this.input.isJustPressed('ArrowDown', 'KeyS')) {
        this.gridSelected = Math.min(this.gridSelected + COLS, totalEnvelopes - 1);
      }
      if (this.input.isJustPressed('ArrowUp', 'KeyW')) {
        this.gridSelected = Math.max(this.gridSelected - COLS, 0);
      }
      if (this.gridSelected !== prevSelected) {
        this.audio.playSFX('scrapbook-nav', 0.5);
      }

      // Open selected envelope (only if unlocked)
      if (this.input.isActionJustPressed()) {
        const levelId = this.gridSelected + 1;
        const isUnlocked = this.unlockedEntries.some(e => e.levelId === levelId);
        if (isUnlocked) {
          this.gridState = 'opening';
          this.gridAnimTimer = 0;
          this.gridEntryDisplayed = 0;
          this.gridEntryCharTimer = 0;
          this.gridPageAlpha = 0;
          this.openedSet.add(levelId);
          this.audio.playSFX('page-turn', 0.7);
        }
      }

      // Exit grid — X key or Escape
      if (this.input.isJustPressed('Escape', 'KeyX')) {
        this.audio.playSFX('menu-back', 0.8);
        this.sceneManager.pop();
      }

    } else if (this.gridState === 'opening') {
      this.gridAnimTimer += dt;
      if (this.gridAnimTimer >= this.ANIM_DUR) {
        this.gridState = 'reading';
        this.gridAnimTimer = this.ANIM_DUR;
      }

    } else if (this.gridState === 'reading') {
      // Fade in page
      this.gridPageAlpha = Math.min(1, this.gridPageAlpha + dt * 4);

      // Typewriter
      const entry = scrapbookEntries[this.gridSelected];
      if (entry && this.gridPageAlpha >= 1) {
        if (this.gridEntryDisplayed < entry.message.length) {
          this.gridEntryCharTimer += dt;
          while (this.gridEntryCharTimer >= this.CHAR_RATE && this.gridEntryDisplayed < entry.message.length) {
            this.gridEntryCharTimer -= this.CHAR_RATE;
            this.gridEntryDisplayed++;
          }
        }
      }

      if (this.input.isActionJustPressed()) {
        const entry2 = scrapbookEntries[this.gridSelected];
        if (this.gridEntryDisplayed < (entry2?.message.length ?? 0)) {
          this.gridEntryDisplayed = entry2?.message.length ?? 0;
        } else {
          // Close back to grid
          this.gridState = 'closing';
          this.gridAnimTimer = this.ANIM_DUR;
        }
      }

    } else if (this.gridState === 'closing') {
      this.gridAnimTimer -= dt;
      this.gridPageAlpha = Math.max(0, this.gridAnimTimer / this.ANIM_DUR);
      if (this.gridAnimTimer <= 0) {
        this.gridState = 'grid';
        this.gridAnimTimer = 0;
        this.gridPageAlpha = 0;
      }
    }
  }

  private updateTheEnd(dt: number): void {
    this.theEndTimer += dt;

    if (this.theEndDisplayed < this.THE_END_TEXT.length) {
      this.theEndCharTimer += dt;
      while (this.theEndCharTimer >= 0.12 && this.theEndDisplayed < this.THE_END_TEXT.length) {
        this.theEndCharTimer -= 0.12;
        this.theEndDisplayed++;
      }
    }

    if (this.theEndDisplayed >= this.THE_END_TEXT.length && this.theEndTimer > 3) {
      this.theEndCanDismiss = true;
    }

    for (const c of this.theEndConfetti) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.rspeed * dt;
      c.vy += 30 * dt;
      if (c.y > 250) { c.y = -10; c.x = Math.random() * 320; c.vy = Math.random() * 20 + 10; }
    }

    for (const p of this.theEndPicRain) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rspeed * dt;
      p.vy += 12 * dt; // gentle gravity
      if (p.y > 260) { p.y = -p.size; p.x = Math.random() * 340 - 10; p.vy = Math.random() * 18 + 8; }
    }

    if (this.theEndCanDismiss && this.input.isActionJustPressed()) {
      if (this.mainMenuFactory) {
        this.sceneManager.switch(this.mainMenuFactory());
      } else {
        this.sceneManager.pop();
      }
    }
  }

  private spawnTheEnd(): void {
    this.audio.playMusic('music-end-credits', 0.8);
    this.theEndMode = true;
    this.theEndTimer = 0;
    this.theEndDisplayed = 0;
    this.theEndCanDismiss = false;

    this.theEndStars = Array.from({ length: 60 }, (_, i) => ({
      x: (i * 71 + 13) % 320,
      y: (i * 37 + 7) % 240,
      size: (i % 3 === 0) ? 2 : 1,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 1.5,
    }));

    this.theEndPicRain = Array.from({ length: 12 }, (_, i) => ({
      x: (i * 29 + 5) % 340 - 10,
      y: Math.random() * 240 - 260,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * 18 + 8,
      rot: Math.random() * Math.PI * 2,
      rspeed: (Math.random() - 0.5) * 1.5,
      size: 22 + Math.random() * 12,
    }));

    const confettiColors = ['#ff6b9d', '#ffd700', '#56b6c2', '#c678dd', '#98c379', '#e06c75'];
    this.theEndConfetti = Array.from({ length: 40 }, () => ({
      x: Math.random() * 320,
      y: Math.random() * 240 - 240,
      vx: (Math.random() - 0.5) * 30,
      vy: Math.random() * 30 + 15,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      rot: Math.random() * Math.PI * 2,
      rspeed: (Math.random() - 0.5) * 6,
      size: 3 + Math.random() * 4,
    }));
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
      EventBus.emit('game-complete', {});
      this.spawnTheEnd();
      return;
    }

    this.sceneManager.switch(this.gameSceneFactory(this.data.nextLevelId));
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  render(ctx: CanvasRenderingContext2D): void {
    if (this.theEndMode) {
      this.renderTheEnd(ctx);
    } else if (this.gridMode) {
      this.renderGrid(ctx);
    } else {
      this.renderPage(ctx);
    }
  }

  // ─── GRID MODE RENDERING ─────────────────────────────────────────────────

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    const progress = this.gridAnimTimer / this.ANIM_DUR; // 0→1 opening, 1→0 closing

    // Background
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, 0, 320, 240);

    // Soft stars bg
    ctx.fillStyle = '#ffffff22';
    for (let i = 0; i < 30; i++) {
      ctx.fillRect((i * 71 + 3) % 318, (i * 37 + 5) % 238, 1, 1);
    }

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("Soso's Scrapbook", 160, 22);

    // Decorative line under title
    ctx.strokeStyle = '#ffd70044';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 26); ctx.lineTo(290, 26);
    ctx.stroke();

    // If in reading or opening/closing, draw the letter page overlaid
    if (this.gridState === 'reading' || this.gridState === 'opening' || this.gridState === 'closing') {
      const showProgress = this.gridState === 'reading' ? 1
        : this.gridState === 'opening' ? progress
        : progress; // closing goes 1→0

      // Partial envelopes at fading-out alpha
      ctx.globalAlpha = 1 - showProgress;
      this.renderEnvelopes(ctx);
      ctx.globalAlpha = 1;

      // Letter page fades in
      if (this.gridState === 'reading') {
        this.renderGridLetterPage(ctx);
      } else if (this.gridState === 'opening' && progress > 0.7) {
        ctx.globalAlpha = (progress - 0.7) / 0.3;
        this.renderGridLetterPage(ctx);
        ctx.globalAlpha = 1;
      } else if (this.gridState === 'closing') {
        this.renderGridLetterPage(ctx);
      }

      // Animated envelope for selected (flap opening)
      if (this.gridState === 'opening' || this.gridState === 'closing') {
        this.renderOpeningEnvelope(ctx, this.gridSelected, progress);
      }

    } else {
      // Normal grid view
      this.renderEnvelopes(ctx);

      // Controls hint at bottom
      ctx.fillStyle = '#ffffff33';
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Arrows to browse   Z to open   X to close', 160, 233);
    }

    ctx.textAlign = 'left';
  }

  private renderEnvelopes(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < 22; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cellX = GRID_LEFT + col * CELL_W;
      const cellY = GRID_TOP + row * CELL_H;
      const levelId = i + 1;
      const isUnlocked = this.unlockedEntries.some(e => e.levelId === levelId);
      const isSelected = i === this.gridSelected;
      const wasOpened = this.openedSet.has(levelId);

      this.drawEnvelope(ctx, cellX, cellY, levelId, isUnlocked, isSelected, wasOpened);
    }
  }

  private renderOpeningEnvelope(ctx: CanvasRenderingContext2D, idx: number, progress: number): void {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const cellX = GRID_LEFT + col * CELL_W;
    const cellY = GRID_TOP + row * CELL_H;

    const baseCx = cellX + CELL_W / 2;
    const baseCy = cellY + CELL_H / 2;

    const scale = 1 + progress * 1.4;
    const cx = Math.round(baseCx + (160 - baseCx) * progress * 0.4);
    const cy = Math.round(baseCy + (120 - baseCy) * progress * 0.4);

    const EW = 38, EH = 26;
    const dw = Math.round(EW * scale);
    const dh = Math.round(EH * scale);
    const ex = cx - Math.floor(dw / 2);
    const ey = cy - Math.floor(dh / 2);

    const isOpen = progress >= 0.5;
    const levelId = idx + 1;

    let body = '#f0e6d0', flap = '#e8d5b0', outline = '#5a3e28', seal = '#c24b4b';
    if (levelId === 22) { body = '#fff3c0'; flap = '#fce57a'; outline = '#8b6914'; seal = '#ffd700'; }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    this.drawPixelEnvelope(ctx, ex, ey, dw, dh, body, flap, outline, seal, isOpen);
    ctx.restore();
  }

  private drawEnvelope(
    ctx: CanvasRenderingContext2D,
    cellX: number, cellY: number,
    levelId: number,
    isUnlocked: boolean,
    isSelected: boolean,
    wasOpened: boolean,
  ): void {
    const EW = 38, EH = 26;
    const envX = Math.round(cellX + (CELL_W - EW) / 2);
    const envY = Math.round(cellY + (CELL_H - EH) / 2) - 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.strokeRect(cellX + 1, cellY + 1, CELL_W - 2, CELL_H - 2);
      ctx.fillStyle = '#ffd70018';
      ctx.fillRect(cellX + 2, cellY + 2, CELL_W - 4, CELL_H - 4);
    }

    // Envelope colors
    let body: string, flap: string, outline: string, seal: string;
    if (!isUnlocked) {
      body = '#2a2a3a'; flap = '#222230'; outline = '#44445a'; seal = '#383848';
      ctx.globalAlpha = 0.55;
    } else if (levelId === 22) {
      body = '#fff3c0'; flap = '#fce57a'; outline = '#8b6914'; seal = '#ffd700';
    } else {
      body = '#f0e6d0'; flap = '#e8d5b0'; outline = '#5a3e28'; seal = '#c24b4b';
    }

    this.drawPixelEnvelope(ctx, envX, envY, EW, EH, body, flap, outline, seal, false);
    ctx.globalAlpha = 1;

    // Already-opened checkmark (top-right corner of cell)
    if (wasOpened && isUnlocked) {
      ctx.fillStyle = '#ffffffbb';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✓', cellX + CELL_W - 5, cellY + 9);
    }

    // Level number below envelope
    ctx.fillStyle = isUnlocked ? '#e8d5a3' : '#55556a';
    ctx.globalAlpha = isUnlocked ? 0.9 : 0.4;
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(levelId), cellX + CELL_W / 2, cellY + CELL_H - 2);
    ctx.globalAlpha = 1;

    // Level 22 animated sparkles
    if (levelId === 22 && isUnlocked) {
      const t = Date.now() / 700;
      ctx.fillStyle = `rgba(255,215,0,${(Math.sin(t) * 0.4 + 0.6).toFixed(2)})`;
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✦', cellX + 4, cellY + 10);
      ctx.fillText('✦', cellX + CELL_W - 4, cellY + 10);
    }

    ctx.textAlign = 'left';
    ctx.restore();
  }

  /** Pure pixel-art envelope drawn with fillRect — no anti-aliasing, hard edges. */
  private drawPixelEnvelope(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    body: string, flap: string, outline: string, seal: string,
    open: boolean,
  ): void {
    const mx = x + Math.floor(w / 2);
    const fh = Math.floor(h * 0.42); // flap height

    // Body fill
    ctx.fillStyle = body;
    ctx.fillRect(x, y, w, h);

    if (!open) {
      // Closed flap: filled triangle from top edge down to center point (mx, y+fh)
      ctx.fillStyle = flap;
      for (let row = 0; row < fh; row++) {
        const t = row / fh;
        const lx = Math.round(x + (mx - x) * t);
        const rx = Math.round(mx + (x + w - mx) * t);
        if (rx > lx) ctx.fillRect(lx, y + row, rx - lx, 1);
      }

      // Wax seal at flap tip
      ctx.fillStyle = seal;
      ctx.fillRect(mx - 2, y + fh - 3, 5, 5);
      // Tiny pixel heart inside seal
      ctx.fillStyle = '#ffffff88';
      ctx.fillRect(mx - 1, y + fh - 2, 1, 1);
      ctx.fillRect(mx + 1, y + fh - 2, 1, 1);
      ctx.fillRect(mx - 1, y + fh - 1, 3, 1);
      ctx.fillRect(mx,     y + fh,     1, 1);

    } else {
      // Open flap: triangle pointing UP (folded back)
      ctx.fillStyle = flap;
      for (let row = 0; row < fh; row++) {
        const t = 1 - row / fh;
        const lx = Math.round(x + (mx - x) * t);
        const rx = Math.round(mx + (x + w - mx) * t);
        if (rx > lx) ctx.fillRect(lx, y + row, rx - lx, 1);
      }
      // Open flap outline diagonals
      ctx.fillStyle = outline;
      for (let row = 0; row < fh; row++) {
        const t = 1 - row / fh;
        ctx.fillRect(Math.round(x + (mx - x) * t),         y + row, 1, 1);
        ctx.fillRect(Math.round(mx + (x + w - mx) * t) - 1, y + row, 1, 1);
      }

      // Letter peeking out from top
      const lw = Math.floor(w * 0.55);
      const lh = Math.floor(h * 0.44);
      const lx2 = mx - Math.floor(lw / 2);
      const ly2 = y - Math.floor(lh * 0.45);
      ctx.fillStyle = '#fffde7';
      ctx.fillRect(lx2, ly2, lw, lh);
      // Letter lines
      ctx.fillStyle = '#c8a97066';
      for (let li = 0; li < 3; li++) {
        ctx.fillRect(lx2 + 2, ly2 + 3 + li * 4, lw - 4 - li, 1);
      }
      // Letter outline
      ctx.fillStyle = outline;
      ctx.fillRect(lx2,          ly2, lw, 1);
      ctx.fillRect(lx2,          ly2, 1,  lh);
      ctx.fillRect(lx2 + lw - 1, ly2, 1,  lh);
    }

    // Body border (1px, on top of everything)
    ctx.fillStyle = outline;
    ctx.fillRect(x,         y,         w, 1); // top
    ctx.fillRect(x,         y + h - 1, w, 1); // bottom
    ctx.fillRect(x,         y,         1, h); // left
    ctx.fillRect(x + w - 1, y,         1, h); // right

    // Flap outline diagonals (for closed flap)
    if (!open) {
      ctx.fillStyle = outline;
      for (let row = 0; row < fh; row++) {
        const t = row / fh;
        ctx.fillRect(Math.round(x + (mx - x) * t),         y + row, 1, 1);
        ctx.fillRect(Math.round(mx + (x + w - mx) * t) - 1, y + row, 1, 1);
      }
    }

    // Bottom fold diagonals (faint)
    const bfh = Math.floor(h * 0.32);
    const savedAlpha = ctx.globalAlpha;
    ctx.globalAlpha = savedAlpha * 0.22;
    ctx.fillStyle = outline;
    for (let row = 0; row < bfh; row++) {
      const t = row / bfh;
      ctx.fillRect(Math.round(x + (mx - x) * t),         y + h - 1 - row, 1, 1);
      ctx.fillRect(Math.round(mx + (x + w - mx) * t) - 1, y + h - 1 - row, 1, 1);
    }
    ctx.globalAlpha = savedAlpha;
  }

  private renderGridLetterPage(ctx: CanvasRenderingContext2D): void {
    const entry = scrapbookEntries[this.gridSelected];
    if (!entry) return;

    const alpha = this.gridPageAlpha;
    const isLevel22 = entry.levelId === 22;

    // Dark overlay
    ctx.fillStyle = `rgba(5,5,20,${0.75 * alpha})`;
    ctx.fillRect(0, 0, 320, 240);

    ctx.globalAlpha = alpha;

    // Page background
    const px = 18, py = 14, pw = 284, ph = 212;
    ctx.fillStyle = '#fdf6e3';
    this.roundRect(ctx, px, py, pw, ph, 3);
    ctx.fill();
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    this.roundRect(ctx, px + 1, py + 1, pw - 2, ph - 2, 3);
    ctx.stroke();

    // Level 22 decorations
    if (isLevel22) this.renderLevel22Decorations(ctx, px, py, pw, ph);

    // Title
    ctx.fillStyle = isLevel22 ? '#c2185b' : '#8b6914';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(entry.title, 160, py + 16);

    // Divider
    ctx.strokeStyle = isLevel22 ? '#f48fb188' : '#c8a97088';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 16, py + 21); ctx.lineTo(px + pw - 16, py + 21);
    ctx.stroke();

    // Message text
    const textY = isLevel22 ? py + 35 : py + 32;
    ctx.fillStyle = '#3d2b1f';
    ctx.font = '6px monospace';
    ctx.textAlign = 'left';
    const displayed = entry.message.slice(0, this.gridEntryDisplayed);
    this.drawWrappedText(ctx, displayed, px + 10, textY, pw - 20, 9);

    // Photo (polaroid)
    if (entry.photoKey) {
      this.renderPhotoInPage(ctx, entry.photoKey, px, py, pw, ph);
    }

    // Cursor / close hint
    if (this.gridEntryDisplayed >= entry.message.length) {
      const blink = Math.floor(Date.now() / 600) % 2;
      if (blink) {
        ctx.fillStyle = isLevel22 ? '#c2185b' : '#8b6914';
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('▼ Z to close', px + pw - 8, py + ph - 8);
      }
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // ─── AFTER-LEVEL PAGE RENDERING ──────────────────────────────────────────

  private renderPage(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = `rgba(5,5,20,${0.8 * this.pageAlpha})`;
    ctx.fillRect(0, 0, 320, 240);

    if (this.pageAlpha < 0.3) return;

    const a = Math.min(1, (this.pageAlpha - 0.3) / 0.7);
    ctx.globalAlpha = a;

    const px = 16, py = 12, pw = 288, ph = 216;
    ctx.fillStyle = '#fdf6e3';
    this.roundRect(ctx, px, py, pw, ph, 3);
    ctx.fill();
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    this.roundRect(ctx, px + 1, py + 1, pw - 2, ph - 2, 3);
    ctx.stroke();

    const entry = this.currentEntry;
    const isLevel22 = entry?.levelId === 22;

    if (isLevel22) this.renderLevel22Decorations(ctx, px, py, pw, ph);

    if (entry) {
      ctx.fillStyle = isLevel22 ? '#c2185b' : '#8b6914';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(entry.title, 160, py + 16);

      ctx.strokeStyle = isLevel22 ? '#f48fb188' : '#c8a97088';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 16, py + 21); ctx.lineTo(px + pw - 16, py + 21);
      ctx.stroke();

      const textStartY = isLevel22 ? py + 35 : py + 32;
      ctx.fillStyle = '#3d2b1f';
      ctx.font = '6px monospace';
      ctx.textAlign = 'left';
      const displayed = entry.message.slice(0, this.displayedChars);
      this.drawWrappedText(ctx, displayed, px + 10, textStartY, pw - 20, 9);

      // Photo (polaroid)
      if (entry.photoKey) {
        this.renderPhotoInPage(ctx, entry.photoKey, px, py, pw, ph);
      }

      if (this.displayedChars >= entry.message.length) {
        const blink = Math.floor(Date.now() / 600) % 2;
        if (blink) {
          ctx.fillStyle = isLevel22 ? '#c2185b' : '#8b6914';
          ctx.font = '8px monospace';
          ctx.textAlign = 'right';
          ctx.fillText('▼ Press Z', px + pw - 8, py + ph - 8);
        }
      }

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

      const save = this.saveManager.getLevelSave(entry.levelId);
      if (save && !isLevel22) {
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

  // ─── LEVEL 22 DECORATIONS ────────────────────────────────────────────────

  private renderLevel22Decorations(
    ctx: CanvasRenderingContext2D,
    px: number, py: number, pw: number, _ph: number,
  ): void {
    const t = Date.now() / 1000;

    // Balloons (top-left)
    const balloons: Array<{ cx: number; cy: number; color: string; phase: number }> = [
      { cx: px + 18, cy: py + 20, color: '#ff6b9d', phase: 0 },
      { cx: px + 30, cy: py + 16, color: '#ffd700', phase: 0.8 },
      { cx: px + 42, cy: py + 21, color: '#56b6c2', phase: 1.5 },
    ];
    for (const b of balloons) {
      const bob = Math.sin(t * 1.8 + b.phase) * 2;
      const bx = b.cx, by = b.cy + bob;
      ctx.strokeStyle = '#88888866'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, by + 8); ctx.lineTo(bx + 1, by + 16); ctx.stroke();
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.ellipse(bx, by, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(bx - 2, by - 3, 2, 3, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(bx, by + 8, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // Crepe stack (top-right)
    const cx2 = px + pw - 22;
    const baseY = py + 26;
    ctx.fillStyle = '#e0d0b0';
    ctx.beginPath(); ctx.ellipse(cx2, baseY + 3, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 2; i >= 0; i--) {
      const cy2 = baseY - i * 3;
      ctx.fillStyle = '#f5deb3';
      ctx.beginPath(); ctx.ellipse(cx2, cy2, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e8c97a'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx2 - 8, cy2); ctx.lineTo(cx2 + 6, cy2 - 1); ctx.stroke();
    }
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(cx2 - 3, baseY - 10, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#27ae60'; ctx.fillRect(cx2 - 4, baseY - 14, 2, 3);
    ctx.fillStyle = '#fffde7';
    ctx.beginPath(); ctx.arc(cx2 + 3, baseY - 10, 4, 0, Math.PI * 2); ctx.fill();

    // Star sparkles
    const sparkPositions = [[px + 60, py + 18], [px + pw - 55, py + 18]];
    for (const [sx, sy] of sparkPositions) {
      ctx.globalAlpha = (Math.sin(t * 3 + sx) * 0.5 + 0.5) * 0.8;
      ctx.fillStyle = '#ffd700';
      ctx.font = '8px monospace'; ctx.textAlign = 'center';
      ctx.fillText('✦', sx, sy);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // ─── THE END ANIMATION ───────────────────────────────────────────────────

  private renderTheEnd(ctx: CanvasRenderingContext2D): void {
    const t = this.theEndTimer;

    ctx.filter = 'blur(4px)';
    ctx.globalAlpha = Math.max(0, 1 - t * 0.4);
    ctx.fillStyle = '#fdf6e3';
    this.roundRect(ctx, 16, 12, 288, 216, 3);
    ctx.fill();
    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    const bgAlpha = Math.min(1, t * 0.5);
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, `rgba(5,2,20,${bgAlpha})`);
    grad.addColorStop(1, `rgba(10,5,30,${bgAlpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 240);

    for (const star of this.theEndStars) {
      star.twinkle += star.speed * 0.05;
      const alpha = (Math.sin(star.twinkle) * 0.4 + 0.6) * Math.min(1, t * 0.8);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
    }

    for (const c of this.theEndConfetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.globalAlpha = Math.min(1, t * 0.6) * 0.9;
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      ctx.restore();
    }

    const memojiImg = this.assets?.getImage('soso-memoji');
    if (memojiImg) {
      for (const p of this.theEndPicRain) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, t * 0.5) * 0.88;
        ctx.drawImage(memojiImg, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    if (t > 0.8) {
      ctx.globalAlpha = Math.min(1, (t - 0.8) * 1.5);
      ctx.shadowColor = '#ff6b9d';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff6b9d';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      const shown = this.THE_END_TEXT.slice(0, this.theEndDisplayed);
      ctx.fillText(shown, 160, 110);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(shown, 160, 110);
      ctx.globalAlpha = 1;
    }

    if (t > 2.5 && this.theEndDisplayed >= this.THE_END_TEXT.length) {
      ctx.globalAlpha = Math.min(1, (t - 2.5) * 1.2);
      ctx.fillStyle = '#cc99bb';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('I will always love you Mr. Stark.', 160, 128);
      ctx.fillStyle = '#888899';
      ctx.font = '6px monospace';
      ctx.fillText('Pepper Potts. 💖 ∞', 160, 140);
      ctx.globalAlpha = 1;
    }

    if (this.theEndCanDismiss) {
      const blink = Math.floor(Date.now() / 700) % 2;
      if (blink) {
        ctx.fillStyle = '#ffffff55';
        ctx.font = '5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Press Z to return to menu', 160, 228);
      }
    }

    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  // ─── SHARED HELPERS ──────────────────────────────────────────────────────

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string, x: number, y: number, maxWidth: number, lineHeight: number,
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

  private renderPhotoInPage(
    ctx: CanvasRenderingContext2D,
    photoKey: string,
    px: number, py: number, pw: number, ph: number,
  ): void {
    const img = this.assets?.getImage(photoKey);
    if (!img) return;

    // Polaroid: 4px border top/sides, 10px white bottom strip
    const border = 4;
    const bottomStrip = 10;
    const photoW = 120;
    const photoH = 92;
    const polW = photoW + border * 2;
    const polH = photoH + border + bottomStrip;

    const polX = px + Math.floor((pw - polW) / 2);
    const polY = py + ph - polH - 8;

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(polX + 3, polY + 3, polW, polH);

    // White polaroid body
    ctx.fillStyle = '#fffef8';
    ctx.fillRect(polX, polY, polW, polH);

    // Photo area background (letterbox bars)
    ctx.fillStyle = '#f0e8d8';
    ctx.fillRect(polX + border, polY + border, photoW, photoH);

    // Photo (contain — full image visible, centred)
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const frameRatio = photoW / photoH;
    let dw: number, dh: number;
    if (imgRatio > frameRatio) {
      dw = photoW;
      dh = photoW / imgRatio;
    } else {
      dh = photoH;
      dw = photoH * imgRatio;
    }
    const imgX = polX + border + Math.round((photoW - dw) / 2);
    const imgY = polY + border + Math.round((photoH - dh) / 2);
    ctx.drawImage(img, imgX, imgY, dw, dh);

    // Thin frame around polaroid
    ctx.strokeStyle = '#c8b898';
    ctx.lineWidth = 1;
    ctx.strokeRect(polX + 0.5, polY + 0.5, polW - 1, polH - 1);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
    ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
    ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
    ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }

  destroy(): void {
    if (this.birthdayCardTimer !== null) {
      clearTimeout(this.birthdayCardTimer);
      this.birthdayCardTimer = null;
    }
  }
}

// Forward declaration to avoid circular import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GameScene = any;

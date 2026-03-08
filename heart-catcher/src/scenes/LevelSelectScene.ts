import type { Scene } from '../engine/SceneManager';
import type { SceneManager } from '../engine/SceneManager';
import type { InputManager } from '../engine/InputManager';
import type { AudioEngine } from '../engine/AudioEngine';
import type { SaveManager } from '../systems/SaveManager';
import type { GameScene } from './GameScene';

const COLS = 5;
const CELL_W = 52;
const CELL_H = 28;
const GAP_X = 4;
const GAP_Y = 4;
const GRID_X = Math.round((320 - (COLS * CELL_W + (COLS - 1) * GAP_X)) / 2);
const GRID_Y = 38;

const SEASON_COLOR: Record<string, string> = {
  spring: '#e07899',
  summer: '#5aaa5a',
  autumn: '#c86020',
  winter: '#6090cc',
  finale: '#ccaa00',
};

function getSeasonForLevel(levelId: number): string {
  if (levelId <= 5)  return 'spring';
  if (levelId <= 12) return 'summer';
  if (levelId <= 18) return 'autumn';
  if (levelId <= 21) return 'winter';
  return 'finale';
}

/**
 * LevelSelectScene — grid showing all 22 levels.
 * Unlocked levels (id <= saveManager.currentLevel) are selectable.
 * Completed levels show a check mark; locked levels are grayed and unnavigable.
 */
export class LevelSelectScene implements Scene {
  private selectedIndex = 0;
  private cursorBounce = 0;

  constructor(
    private readonly sceneManager: SceneManager,
    private readonly input: InputManager,
    private readonly audio: AudioEngine,
    private readonly saveManager: SaveManager,
    private readonly gameSceneFactory: (levelId: number) => GameScene,
  ) {}

  init(): void {
    // Start cursor on the current (next unbeaten) level
    this.selectedIndex = Math.max(0, Math.min(21, this.saveManager.currentLevel - 1));
    this.cursorBounce = 0;
  }

  update(dt: number): void {
    this.input.pollGamepad();
    this.cursorBounce += dt * 4;

    const maxIndex = this.saveManager.currentLevel - 1; // highest unlocked index (0-based)

    const prevIndex = this.selectedIndex;
    if (this.input.isJustPressed('ArrowRight', 'KeyD')) {
      const next = this.selectedIndex + 1;
      if (next <= 21 && next <= maxIndex) this.selectedIndex = next;
    }
    if (this.input.isJustPressed('ArrowLeft', 'KeyA')) {
      const prev = this.selectedIndex - 1;
      if (prev >= 0) this.selectedIndex = prev;
    }
    if (this.input.isJustPressed('ArrowDown', 'KeyS')) {
      const next = this.selectedIndex + COLS;
      if (next <= 21 && next <= maxIndex) this.selectedIndex = next;
    }
    if (this.input.isJustPressed('ArrowUp', 'KeyW')) {
      const prev = this.selectedIndex - COLS;
      if (prev >= 0) this.selectedIndex = prev;
    }
    if (this.selectedIndex !== prevIndex) {
      this.audio.playSFX('level-select-nav', 0.6);
    }

    // Play selected level
    if (this.input.isActionJustPressed()) {
      const levelId = this.selectedIndex + 1;
      if (levelId <= this.saveManager.currentLevel) {
        this.sceneManager.switch(this.gameSceneFactory(levelId));
        this.input.flush();
        return;
      }
    }

    // Back to main menu
    if (this.input.isJustPressed('Escape', 'KeyX')) {
      this.audio.playSFX('menu-back', 0.8);
      this.sceneManager.pop();
    }

    this.input.flush();
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Background
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, 320, 240);

    // Stars
    ctx.fillStyle = '#ffffff44';
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 71) % 318) + 1;
      const sy = ((i * 37) % 238) + 1;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Title
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Level Select', 160, 22);
    ctx.textAlign = 'left';

    const currentLevel = this.saveManager.currentLevel;

    for (let i = 0; i < 22; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = GRID_X + col * (CELL_W + GAP_X);
      const cy = GRID_Y + row * (CELL_H + GAP_Y);
      const levelId = i + 1;
      const isSelected = i === this.selectedIndex;
      const isUnlocked = levelId <= currentLevel;
      const isComplete = this.saveManager.isLevelComplete(levelId);
      const season = getSeasonForLevel(levelId);
      const color = SEASON_COLOR[season];

      // Cell background
      if (isSelected && isUnlocked) {
        ctx.fillStyle = `${color}44`;
      } else if (isComplete) {
        ctx.fillStyle = `${color}1a`;
      } else if (isUnlocked) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
      }
      ctx.fillRect(cx, cy, CELL_W, CELL_H);

      // Cell border
      if (isSelected && isUnlocked) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
      } else if (isComplete) {
        ctx.strokeStyle = `${color}88`;
        ctx.lineWidth = 1;
      } else if (isUnlocked) {
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
      }
      ctx.strokeRect(cx + 0.5, cy + 0.5, CELL_W - 1, CELL_H - 1);

      if (isUnlocked) {
        // Level number
        ctx.fillStyle = isSelected ? '#ffffff' : (isComplete ? color : '#8888aa');
        ctx.font = isSelected ? 'bold 8px monospace' : '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${levelId}`, cx + CELL_W / 2, cy + 11);

        // Season label
        ctx.fillStyle = isSelected ? `${color}dd` : `${color}77`;
        ctx.font = '5px monospace';
        ctx.fillText(season, cx + CELL_W / 2, cy + 21);

        // Check mark for completed
        if (isComplete) {
          ctx.fillStyle = color;
          ctx.font = 'bold 7px monospace';
          ctx.fillText('v', cx + CELL_W - 8, cy + 9);
        }
      } else {
        // Locked — dim level number with lock indicator
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${levelId}`, cx + CELL_W / 2, cy + 11);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = '5px monospace';
        ctx.fillText('[locked]', cx + CELL_W / 2, cy + 21);
      }
    }

    ctx.textAlign = 'left';

    // Bottom hint
    ctx.fillStyle = '#ffffff44';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Arrows to navigate   Z/Space to play   Esc to go back', 160, 232);
    ctx.textAlign = 'left';
  }

  destroy(): void {}
}

import type { Scene } from '../engine/SceneManager';
import type { SceneManager } from '../engine/SceneManager';
import type { InputManager } from '../engine/InputManager';
import type { AudioEngine } from '../engine/AudioEngine';

interface SettingRow {
  label: string;
  key: 'music' | 'sfx';
  value: number;
}

export class SettingsScene implements Scene {
  private rows: SettingRow[] = [];
  private selected = 0;
  private holdTimer = 0;
  private holdDir = 0;
  private readonly HOLD_DELAY = 0.35;
  private readonly HOLD_REPEAT = 0.08;
  private nextHold = 0;

  constructor(
    private readonly sceneManager: SceneManager,
    private readonly input: InputManager,
    private readonly audio: AudioEngine,
  ) {}

  init(): void {
    this.selected = 0;
    this.holdTimer = 0;
    this.holdDir = 0;
    this.rows = [
      { label: 'Music Volume', key: 'music', value: this.audio.musicVolume },
      { label: 'SFX Volume',   key: 'sfx',   value: this.audio.sfxVolume  },
    ];
  }

  update(dt: number): void {
    this.input.pollGamepad();

    // Navigate up/down
    if (this.input.isJustPressed('ArrowUp', 'KeyW')) {
      this.selected = Math.max(0, this.selected - 1);
    }
    if (this.input.isJustPressed('ArrowDown', 'KeyS')) {
      this.selected = Math.min(this.rows.length - 1, this.selected + 1);
    }

    // Adjust volume left/right with hold-to-repeat
    const leftDown  = this.input.isDown('ArrowLeft', 'KeyA');
    const rightDown = this.input.isDown('ArrowRight', 'KeyD');
    const dir = leftDown ? -1 : rightDown ? 1 : 0;

    if (dir !== 0) {
      if (dir !== this.holdDir) {
        // New direction pressed — apply immediately and reset hold timer
        this.holdDir = dir;
        this.holdTimer = 0;
        this.nextHold = this.HOLD_DELAY;
        this.adjustVolume(dir);
      } else {
        this.holdTimer += dt;
        if (this.holdTimer >= this.nextHold) {
          this.nextHold = this.holdTimer + this.HOLD_REPEAT;
          this.adjustVolume(dir);
        }
      }
    } else {
      this.holdDir = 0;
      this.holdTimer = 0;
    }

    // Confirm left/right on just-press too
    if (this.input.isJustPressed('ArrowLeft', 'KeyA')) this.adjustVolume(-1);
    if (this.input.isJustPressed('ArrowRight', 'KeyD')) this.adjustVolume(1);

    // Back
    if (this.input.isMenuDown() || this.input.isActionJustPressed()) {
      this.sceneManager.pop();
    }

    this.input.flush();
  }

  private adjustVolume(dir: number): void {
    const row = this.rows[this.selected];
    row.value = Math.max(0, Math.min(1, row.value + dir * 0.05));
    if (row.key === 'music') {
      this.audio.setMusicVolume(row.value);
    } else {
      this.audio.setSFXVolume(row.value);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Background
    ctx.fillStyle = '#0d0d20';
    ctx.fillRect(0, 0, 320, 240);

    // Top bar
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(0, 0, 320, 2);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(0, 2, 320, 1);

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Settings', 160, 26);

    // Divider
    ctx.fillStyle = '#ff6b9d44';
    ctx.fillRect(24, 32, 272, 1);

    // Rows
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const y = 70 + i * 52;
      const isSelected = i === this.selected;

      // Row highlight
      if (isSelected) {
        ctx.fillStyle = '#ffffff10';
        ctx.fillRect(16, y - 14, 288, 40);
        // Selection border
        ctx.strokeStyle = '#ff6b9d44';
        ctx.lineWidth = 1;
        ctx.strokeRect(16, y - 14, 288, 40);
      }

      // Label
      ctx.fillStyle = isSelected ? '#ffd700' : '#aaaacc';
      ctx.font = `bold 8px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(row.label, 24, y);

      // Percentage text
      const pct = Math.round(row.value * 100);
      ctx.fillStyle = isSelected ? '#ffffff' : '#888899';
      ctx.font = '7px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${pct}%`, 296, y);

      // Slider track
      const trackX = 24;
      const trackW = 272;
      const trackY = y + 10;
      const trackH = 6;

      ctx.fillStyle = '#ffffff18';
      ctx.fillRect(trackX, trackY, trackW, trackH);

      // Filled portion
      const fillW = Math.round(row.value * trackW);
      const fillColor = isSelected ? '#ff6b9d' : '#7766aa';
      ctx.fillStyle = fillColor;
      ctx.fillRect(trackX, trackY, fillW, trackH);

      // Knob
      const knobX = trackX + fillW;
      ctx.fillStyle = isSelected ? '#ffffff' : '#aaaacc';
      ctx.fillRect(knobX - 2, trackY - 2, 4, trackH + 4);

      // Arrow indicators when selected
      if (isSelected) {
        ctx.fillStyle = '#ffffff88';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('◀', 14, trackY + 5);
        ctx.fillText('▶', 306, trackY + 5);
      }
    }

    // Hint
    ctx.fillStyle = '#ffffff44';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('↑ ↓ to select  ◀ ▶ to adjust  Esc / Z to save & go back', 160, 220);

    // Bottom bar
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(0, 237, 320, 1);
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(0, 238, 320, 2);

    ctx.textAlign = 'left';
  }

  destroy(): void {}
}

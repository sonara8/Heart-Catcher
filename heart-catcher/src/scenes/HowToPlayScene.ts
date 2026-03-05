import type { Scene } from '../engine/SceneManager';
import type { SceneManager } from '../engine/SceneManager';
import type { InputManager } from '../engine/InputManager';

interface HowToPlayPage {
  title: string;
  lines: Array<{ label: string; desc: string }>;
}

const PAGES: HowToPlayPage[] = [
  {
    title: 'Movement & Controls',
    lines: [
      { label: 'Arrow Keys / WASD', desc: 'Move Dancy' },
      { label: 'Shift', desc: 'Hold to run faster' },
      { label: 'Z / Space / Enter', desc: 'Interact / confirm' },
      { label: 'X / Escape', desc: 'Back / pause' },
      { label: 'Gamepad', desc: 'D-Pad + A button also work' },
      { label: 'Tap (mobile)', desc: 'Tap anywhere to walk there' },
    ],
  },
  {
    title: 'Finding Hearts',
    lines: [
      { label: 'Tall grass  ❤', desc: 'Hearts hide in tall grass tiles' },
      { label: 'Interact key', desc: 'Press Z facing a grass tile to check it' },
      { label: 'Compass', desc: 'Pulses faster the closer you are to a heart' },
      { label: 'Red compass', desc: 'You\'re very close — keep searching!' },
      { label: 'Heart counter', desc: 'Top-left shows how many you still need' },
      { label: 'Complete level', desc: 'Find all required hearts to move on' },
    ],
  },
  {
    title: 'Seasons & Specials',
    lines: [
      { label: 'Spring', desc: 'Peaceful — good for learning the basics' },
      { label: 'Summer', desc: 'Sneaky hearts that flee when you get close' },
      { label: 'Autumn', desc: 'Watch out for berry decoys — Soso giggles!' },
      { label: 'Winter', desc: 'Shovel snow tiles to uncover hidden spots' },
      { label: 'Fog (Winter)', desc: 'Only nearby tiles are visible' },
      { label: 'Level 22', desc: '22 golden hearts in Birthday Grove 🎂' },
    ],
  },
  {
    title: 'Power-Ups',
    lines: [
      { label: '👟 Running Shoes', desc: 'Walk over to collect — moves faster' },
      { label: '🌸 Sweet Scent', desc: 'One-use: reveals hearts within 5 tiles' },
      { label: '🌿 Mower', desc: 'Check a 3×3 area all at once' },
      { label: '📷 Memory Fragment', desc: 'Unlocks a special photo memory' },
      { label: 'Master Catcher', desc: 'Find all hearts with zero decoy errors' },
      { label: 'Scrapbook', desc: 'Soso\'s messages unlock after each level' },
    ],
  },
];

export class HowToPlayScene implements Scene {
  private page = 0;
  private pageAlpha = 1;
  private slideDir = 0; // -1 = left, 1 = right

  constructor(
    private readonly sceneManager: SceneManager,
    private readonly input: InputManager,
  ) {}

  init(): void {
    this.page = 0;
    this.pageAlpha = 1;
    this.slideDir = 0;
  }

  update(dt: number): void {
    this.input.pollGamepad();

    const left = this.input.isJustPressed('ArrowLeft', 'KeyA');
    const right = this.input.isJustPressed('ArrowRight', 'KeyD');

    if (right && this.page < PAGES.length - 1) {
      this.page++;
      this.slideDir = 1;
      this.pageAlpha = 0;
    }
    if (left && this.page > 0) {
      this.page--;
      this.slideDir = -1;
      this.pageAlpha = 0;
    }

    // Fade in
    if (this.pageAlpha < 1) {
      this.pageAlpha = Math.min(1, this.pageAlpha + dt * 6);
    }

    const back = this.input.isMenuDown() || this.input.isActionJustPressed();
    if (back) {
      this.sceneManager.pop();
    }

    this.input.flush();
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Dark background
    ctx.fillStyle = '#0d0d20';
    ctx.fillRect(0, 0, 320, 240);

    // Decorative top bar
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(0, 0, 320, 2);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(0, 2, 320, 1);

    // Page title
    const p = PAGES[this.page];
    ctx.globalAlpha = this.pageAlpha;

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.title, 160, 24);

    // Divider
    ctx.fillStyle = '#ff6b9d44';
    ctx.fillRect(24, 29, 272, 1);

    // Content rows
    const startY = 44;
    const lineH = 26;
    for (let i = 0; i < p.lines.length; i++) {
      const row = p.lines[i];
      const y = startY + i * lineH;

      // Row bg alternating
      ctx.fillStyle = i % 2 === 0 ? '#ffffff08' : '#00000000';
      ctx.fillRect(12, y - 9, 296, lineH - 2);

      // Key/label
      ctx.fillStyle = '#7ec8e3';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(row.label, 18, y);

      // Description
      ctx.fillStyle = '#cccccc';
      ctx.font = '6px monospace';
      ctx.fillText(row.desc, 18, y + 10);
    }

    ctx.globalAlpha = 1;

    // Page dots
    const dotY = 212;
    const totalDots = PAGES.length;
    const dotSpacing = 10;
    const startX = 160 - ((totalDots - 1) * dotSpacing) / 2;
    for (let i = 0; i < totalDots; i++) {
      ctx.fillStyle = i === this.page ? '#ffd700' : '#ffffff33';
      ctx.beginPath();
      ctx.arc(startX + i * dotSpacing, dotY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Navigation hints
    ctx.fillStyle = '#ffffff55';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';

    if (this.page > 0) {
      ctx.fillStyle = '#aaaacc';
      ctx.fillText('◀ ◀', 30, dotY + 1);
    }
    if (this.page < PAGES.length - 1) {
      ctx.fillStyle = '#aaaacc';
      ctx.fillText('▶ ▶', 290, dotY + 1);
    }

    ctx.fillStyle = '#ffffff44';
    ctx.fillText('Esc / Z to go back', 160, 230);

    // Decorative bottom bar
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(0, 237, 320, 1);
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(0, 238, 320, 2);

    ctx.textAlign = 'left';
  }

  destroy(): void {}
}

import type { Scene } from '../engine/SceneManager';
import type { SceneManager } from '../engine/SceneManager';
import type { InputManager } from '../engine/InputManager';
import type { AudioEngine } from '../engine/AudioEngine';
import type { SaveManager } from '../systems/SaveManager';
import type { GameScene } from './GameScene';
import type { HowToPlayScene } from './HowToPlayScene';
import type { SettingsScene } from './SettingsScene';

interface LetterAnim {
  char: string;
  x: number;
  y: number;
  targetY: number;
  vy: number;
  settled: boolean;
}

type MenuId = 'start' | 'howtoplay' | 'settings';

interface MenuItem {
  id: MenuId;
  label: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'start',     label: 'Start Game'  },
  { id: 'howtoplay', label: 'How to Play' },
  { id: 'settings',  label: 'Settings'    },
];

/**
 * MainMenuScene — title screen with letter-drop animation and menu.
 * "Happy Birthday Dancy" letters drop in one by one with bounce,
 * then a navigable menu appears: Start / How to Play / Settings.
 */
export class MainMenuScene implements Scene {
  private letters: LetterAnim[] = [];
  private subtitleAlpha = 0;
  private timer = 0;
  private menuReady = false;
  private blinkTimer = 0;
  private selectedItem = 0;
  private menuAlpha = 0;
  private cursorBounce = 0;

  constructor(
    private readonly sceneManager: SceneManager,
    private readonly input: InputManager,
    private readonly audio: AudioEngine,
    private readonly saveManager: SaveManager,
    private readonly gameSceneFactory: (levelId: number) => GameScene,
    private readonly howToPlayFactory: () => HowToPlayScene,
    private readonly settingsFactory: () => SettingsScene,
  ) {}

  init(): void {
    this.timer = 0;
    this.menuReady = false;
    this.subtitleAlpha = 0;
    this.blinkTimer = 0;
    this.selectedItem = 0;
    this.menuAlpha = 0;
    this.cursorBounce = 0;
    this.buildLetterAnims();
    this.audio.playMusic('music-spring', 1);
  }

  private buildLetterAnims(): void {
    const title = 'Happy Birthday';
    const subtitle = 'Dancy!';
    this.letters = [];

    let x = 160 - (title.length * 8) / 2;
    for (const char of title) {
      this.letters.push({ char, x, y: -20, targetY: 70, vy: 0, settled: false });
      x += 8;
    }

    x = 160 - (subtitle.length * 10) / 2;
    for (const char of subtitle) {
      this.letters.push({ char, x, y: -40, targetY: 86, vy: 0, settled: false });
      x += 10;
    }
  }

  update(dt: number): void {
    this.input.pollGamepad();
    this.timer += dt;
    this.blinkTimer += dt;
    this.cursorBounce += dt * 4;

    // Drop letters in sequence
    let allSettled = true;
    for (let i = 0; i < this.letters.length; i++) {
      const l = this.letters[i];
      if (l.settled) continue;

      const launchTime = i * 0.07;
      if (this.timer < launchTime) { allSettled = false; continue; }

      l.vy += 400 * dt;
      l.y += l.vy * dt;

      if (l.y >= l.targetY) {
        l.y = l.targetY;
        l.vy = -l.vy * 0.45;
        if (Math.abs(l.vy) < 20) l.settled = true;
      }
      allSettled = false;
    }

    if (allSettled && this.timer > this.letters.length * 0.07 + 0.3) {
      this.subtitleAlpha = Math.min(1, this.subtitleAlpha + dt * 2);
    }

    if (this.subtitleAlpha >= 1) {
      this.menuAlpha = Math.min(1, this.menuAlpha + dt * 3);
      if (this.menuAlpha >= 0.5) this.menuReady = true;
    }

    if (this.menuReady) {
      if (this.input.isJustPressed('ArrowUp', 'KeyW')) {
        this.selectedItem = (this.selectedItem - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
      }
      if (this.input.isJustPressed('ArrowDown', 'KeyS')) {
        this.selectedItem = (this.selectedItem + 1) % MENU_ITEMS.length;
      }

      if (this.input.isActionJustPressed() || this.input.isMenuDown()) {
        this.audio.init();
        this.selectItem(MENU_ITEMS[this.selectedItem].id);
      }
    }

    this.input.flush();
  }

  private selectItem(id: MenuId): void {
    switch (id) {
      case 'start': {
        const levelId = this.saveManager.currentLevel;
        this.sceneManager.switch(this.gameSceneFactory(levelId));
        break;
      }
      case 'howtoplay':
        this.sceneManager.push(this.howToPlayFactory());
        break;
      case 'settings':
        this.sceneManager.push(this.settingsFactory());
        break;
    }
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

    // Animated title letters
    const titleEnd = 14; // 'Happy Birthday' = 14 chars
    for (let i = 0; i < this.letters.length; i++) {
      const l = this.letters[i];
      if (l.y < -10) continue;
      const isSubtitle = i >= titleEnd;
      ctx.fillStyle = isSubtitle ? '#ffd700' : '#ff6b9d';
      ctx.font = isSubtitle ? 'bold 12px monospace' : 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(l.char, Math.round(l.x), Math.round(l.y));
    }
    ctx.textAlign = 'left';

    // Tagline
    if (this.subtitleAlpha > 0) {
      ctx.globalAlpha = this.subtitleAlpha;
      ctx.fillStyle = '#aaaacc';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('A little game made with love by Soso', 160, 104);
      ctx.globalAlpha = 1;
    }

    // Menu items
    if (this.menuAlpha > 0) {
      ctx.globalAlpha = this.menuAlpha;
      const menuStartY = 128;
      const itemH = 22;

      for (let i = 0; i < MENU_ITEMS.length; i++) {
        const item = MENU_ITEMS[i];
        const y = menuStartY + i * itemH;
        const isSelected = i === this.selectedItem;

        if (isSelected) {
          // Selection box
          ctx.fillStyle = '#ff6b9d22';
          ctx.fillRect(80, y - 10, 160, 16);
          ctx.strokeStyle = '#ff6b9d66';
          ctx.lineWidth = 1;
          ctx.strokeRect(80, y - 10, 160, 16);

          // Cursor heart with bounce
          const bounce = Math.sin(this.cursorBounce) * 2;
          ctx.fillStyle = '#ff6b9d';
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('❤', 95, y + bounce);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px monospace';
        } else {
          ctx.fillStyle = '#8888aa';
          ctx.font = '8px monospace';
        }

        ctx.textAlign = 'center';
        ctx.fillText(item.label, 165, y);
      }

      ctx.globalAlpha = 1;
    }

    // Continue info
    if (this.saveManager.currentLevel > 1) {
      ctx.fillStyle = '#ffffff55';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Continue from Level ${this.saveManager.currentLevel}`, 160, 220);
    }

    // Controls hint
    if (this.menuReady) {
      ctx.fillStyle = '#ffffff33';
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('↑ ↓ to navigate   Z / Space to select', 160, 232);
    }

    ctx.textAlign = 'left';
  }

  destroy(): void {}
}

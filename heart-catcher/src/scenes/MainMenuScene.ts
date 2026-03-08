import type { Scene } from '../engine/SceneManager';
import type { SceneManager } from '../engine/SceneManager';
import type { InputManager } from '../engine/InputManager';
import type { AudioEngine } from '../engine/AudioEngine';
import type { SaveManager } from '../systems/SaveManager';
import type { AssetLoader } from '../engine/AssetLoader';
import type { GameScene } from './GameScene';
import type { HowToPlayScene } from './HowToPlayScene';
import type { SettingsScene } from './SettingsScene';
import type { ScrapbookScene } from './ScrapbookScene';
import type { LevelSelectScene } from './LevelSelectScene';

type MenuId = 'start' | 'levels' | 'scrapbook' | 'settings';

interface MenuItem {
  id: MenuId;
  label: string;
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'start',     label: 'Start Game' },
  { id: 'levels',    label: 'Levels'     },
  { id: 'scrapbook', label: 'Scrapbook'  },
  { id: 'settings',  label: 'Settings'  },
];

const LOGO_TARGET_CY = 68;
const LOGO_MAX_W = 200;
const LOGO_MAX_H = 120;

/**
 * MainMenuScene — title screen with logo drop animation and menu.
 * The Heart Catcher logo image drops in from the top with bounce,
 * squash-and-stretch on landing, then bobs gently with a shimmer
 * sweep and particle sparkles.
 */
export class MainMenuScene implements Scene {
  private logoPhase: 'drop' | 'squash' | 'spring' | 'idle' = 'drop';
  private logoCY = -80;
  private logoVY = 0;
  private logoScaleX = 1;
  private logoScaleY = 1;
  private logoAlpha = 0;
  private logoTimer = 0;
  private bobOffset = 0;
  private shimmerX = -115;
  private sparkleTimer = 0;
  private sparkles: Sparkle[] = [];

  private timer = 0;
  private subtitleAlpha = 0;
  private menuReady = false;
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
    private readonly scrapbookFactory: (data: unknown) => ScrapbookScene,
    private readonly levelSelectFactory: () => LevelSelectScene,
    private readonly assets: AssetLoader,
  ) {}

  init(data?: unknown): void {
    const skipIntro = (data as { skipIntro?: boolean })?.skipIntro === true;
    this.timer = 0;
    this.bobOffset = 0;
    this.shimmerX = -115;
    this.sparkleTimer = 0;
    this.sparkles = [];
    this.selectedItem = 0;
    this.cursorBounce = 0;

    if (skipIntro) {
      // Go straight to idle — no drop animation
      this.logoPhase = 'idle';
      this.logoCY = LOGO_TARGET_CY;
      this.logoVY = 0;
      this.logoScaleX = 1;
      this.logoScaleY = 1;
      this.logoAlpha = 1;
      this.logoTimer = 999;
      this.subtitleAlpha = 1;
      this.menuReady = true;
      this.menuAlpha = 1;
    } else {
      this.logoPhase = 'drop';
      this.logoCY = -80;
      this.logoVY = 0;
      this.logoScaleX = 1;
      this.logoScaleY = 1;
      this.logoAlpha = 0;
      this.logoTimer = 0;
      this.subtitleAlpha = 0;
      this.menuReady = false;
      this.menuAlpha = 0;
    }
    this.audio.setMusicVolume(0.3);
    this.audio.playMusic('music-title', 0.8);
  }

  update(dt: number): void {
    this.input.pollGamepad();
    this.timer += dt;
    this.cursorBounce += dt * 4;

    this.updateLogo(dt);
    this.updateSparkles(dt);

    if (this.logoPhase === 'idle' && this.logoTimer > 0.5) {
      this.subtitleAlpha = Math.min(1, this.subtitleAlpha + dt * 2);
    }

    if (this.subtitleAlpha >= 1) {
      this.menuAlpha = Math.min(1, this.menuAlpha + dt * 3);
      if (this.menuAlpha >= 0.5) this.menuReady = true;
    }

    if (this.menuReady) {
      if (this.input.isJustPressed('ArrowUp', 'KeyW')) {
        this.selectedItem = (this.selectedItem - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
        this.audio.playSFX('menu-select', 0.7);
      }
      if (this.input.isJustPressed('ArrowDown', 'KeyS')) {
        this.selectedItem = (this.selectedItem + 1) % MENU_ITEMS.length;
        this.audio.playSFX('menu-select', 0.7);
      }
      if (this.input.isActionJustPressed() || this.input.isMenuDown()) {
        this.audio.playSFX('menu-confirm', 1.0);
        this.selectItem(MENU_ITEMS[this.selectedItem].id);
      }
    }

    this.input.flush();
  }

  private logoDims(): { dw: number; dh: number } {
    const img = this.assets.getImage('heart-catcher-logo');
    if (!img || !img.naturalWidth) return { dw: LOGO_MAX_W, dh: LOGO_MAX_H };
    const ratio = img.naturalWidth / img.naturalHeight;
    if (ratio >= LOGO_MAX_W / LOGO_MAX_H) {
      return { dw: LOGO_MAX_W, dh: LOGO_MAX_W / ratio };
    }
    return { dw: LOGO_MAX_H * ratio, dh: LOGO_MAX_H };
  }

  private updateLogo(dt: number): void {
    switch (this.logoPhase) {
      case 'drop': {
        this.logoAlpha = Math.min(1, this.logoAlpha + dt * 4.5);
        this.logoVY += 800 * dt;
        this.logoCY += this.logoVY * dt;

        if (this.logoCY >= LOGO_TARGET_CY) {
          this.logoCY = LOGO_TARGET_CY;
          this.logoVY = -this.logoVY * 0.38;
          this.spawnImpactSparkles();
          if (Math.abs(this.logoVY) < 35) {
            this.logoVY = 0;
            this.logoPhase = 'squash';
            this.logoTimer = 0;
            this.logoScaleX = 1.18;
            this.logoScaleY = 0.72;
          }
        }
        break;
      }

      case 'squash': {
        this.logoTimer += dt;
        const t = Math.min(1, this.logoTimer / 0.25);
        this.logoScaleX = 1.18 - 0.18 * t;
        this.logoScaleY = 0.72 + 0.28 * t;
        if (t >= 1) {
          this.logoPhase = 'spring';
          this.logoTimer = 0;
        }
        break;
      }

      case 'spring': {
        this.logoTimer += dt;
        const t = this.logoTimer / 0.35;
        const env = Math.max(0, 1 - t);
        this.logoScaleY = 1 + 0.08 * Math.sin(t * Math.PI) * env;
        this.logoScaleX = 1 - 0.04 * Math.sin(t * Math.PI) * env;
        if (this.logoTimer >= 0.35) {
          this.logoScaleX = 1;
          this.logoScaleY = 1;
          this.logoPhase = 'idle';
          this.logoTimer = 0;
          this.shimmerX = -115;
        }
        break;
      }

      case 'idle': {
        this.logoTimer += dt;
        this.bobOffset = Math.sin(this.timer * 1.8) * 2.5;

        // Screen-space shimmer sweep: -40 → 360, then pause (reset to -220)
        this.shimmerX += dt * 210;
        if (this.shimmerX > 360) this.shimmerX = -220;

        this.sparkleTimer += dt;
        if (this.sparkleTimer >= 0.28) {
          this.sparkleTimer = 0;
          this.spawnIdleSparkles();
        }
        break;
      }
    }
  }

  private spawnImpactSparkles(): void {
    const { dw, dh } = this.logoDims();
    const hw = dw / 2;
    const bottomY = LOGO_TARGET_CY + dh / 2;

    for (let i = 0; i < 40; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.7;
      const speed = 80 + Math.random() * 220;
      const maxL = 0.4 + Math.random() * 0.5;
      this.sparkles.push({
        x: 160 + (Math.random() - 0.5) * hw * 1.8,
        y: bottomY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxL,
        maxLife: maxL,
      });
    }
  }

  private spawnIdleSparkles(): void {
    const { dw, dh } = this.logoDims();
    const hw = dw / 2;
    const cy = LOGO_TARGET_CY + this.bobOffset;

    for (let i = 0; i < 4; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const maxL = 0.9 + Math.random() * 0.4;
      this.sparkles.push({
        x: 160 + side * (hw * 0.65 + Math.random() * hw * 0.4),
        y: cy + (Math.random() - 0.5) * dh * 1.1,
        vx: side * (4 + Math.random() * 14),
        vy: -(18 + Math.random() * 38),
        life: maxL,
        maxLife: maxL,
      });
    }
  }

  private updateSparkles(dt: number): void {
    for (const s of this.sparkles) {
      s.vy += 38 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this.sparkles = this.sparkles.filter(s => s.life > 0);
  }

  private selectItem(id: MenuId): void {
    switch (id) {
      case 'start': {
        const levelId = this.saveManager.currentLevel;
        this.sceneManager.switch(this.gameSceneFactory(levelId));
        break;
      }
      case 'levels':
        this.sceneManager.push(this.levelSelectFactory());
        break;
      case 'scrapbook': {
        const browseData = { timeMs: -1, levelId: 0, heartsFound: 0, masterCatcher: false, nextLevelId: 0 };
        this.sceneManager.push(this.scrapbookFactory(browseData), browseData);
        break;
      }
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

    // Warm spotlight glow behind logo
    if (this.logoAlpha > 0) {
      const gcy = this.logoCY + this.bobOffset;
      const grd = ctx.createRadialGradient(160, gcy, 8, 160, gcy, 130);
      grd.addColorStop(0,   `rgba(255,190,80,${(0.18 * this.logoAlpha).toFixed(3)})`);
      grd.addColorStop(0.5, `rgba(255,80,40,${(0.07 * this.logoAlpha).toFixed(3)})`);
      grd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(20, 0, 280, 220);
    }

    // Full-screen diagonal shimmer sweep
    if (this.logoPhase === 'idle' && this.shimmerX > -40 && this.shimmerX < 360) {
      ctx.save();
      ctx.globalAlpha = 0.22 * this.logoAlpha;
      // Skew: bottom of screen shifts right by ~100px relative to top
      ctx.transform(1, 0, 0.42, 1, 0, 0);
      const sg = ctx.createLinearGradient(this.shimmerX - 10, 0, this.shimmerX + 10, 0);
      sg.addColorStop(0,    'rgba(255,255,255,0)');
      sg.addColorStop(0.4,  'rgba(255,255,255,0.9)');
      sg.addColorStop(0.6,  'rgba(255,255,255,0.9)');
      sg.addColorStop(1,    'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(this.shimmerX - 10, 0, 20, 240);
      ctx.restore();
    }

    // Logo
    this.renderLogo(ctx);

    // Sparkles
    for (let i = 0; i < this.sparkles.length; i++) {
      const s = this.sparkles[i];
      ctx.globalAlpha = (s.life / s.maxLife) * this.logoAlpha;
      ctx.fillStyle = i % 3 === 0 ? '#ff6b9d' : '#ffd700';
      const sz = Math.max(1, Math.round(1 + (s.life / s.maxLife) * 2));
      ctx.fillRect(Math.round(s.x - sz / 2), Math.round(s.y - sz / 2), sz, sz);
    }
    ctx.globalAlpha = 1;

    // Tagline
    if (this.subtitleAlpha > 0) {
      ctx.globalAlpha = this.subtitleAlpha;
      ctx.fillStyle = '#aaaacc';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('A little game made with love by Soso', 160, 148);
      ctx.globalAlpha = 1;
    }

    // Menu
    if (this.menuAlpha > 0) {
      ctx.globalAlpha = this.menuAlpha;
      const menuStartY = 162;
      const itemH = 18;

      for (let i = 0; i < MENU_ITEMS.length; i++) {
        const item = MENU_ITEMS[i];
        const y = menuStartY + i * itemH;
        const isSelected = i === this.selectedItem;

        if (isSelected) {
          ctx.fillStyle = '#ff6b9d22';
          ctx.fillRect(80, y - 10, 160, 16);
          ctx.strokeStyle = '#ff6b9d66';
          ctx.lineWidth = 1;
          ctx.strokeRect(80, y - 10, 160, 16);

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

    // Controls hint
    if (this.menuReady) {
      ctx.fillStyle = '#ffffff33';
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('↑ ↓ to navigate   Z / Space to select', 160, 232);
    }

    ctx.textAlign = 'left';
  }

  private renderLogo(ctx: CanvasRenderingContext2D): void {
    const img = this.assets.getImage('heart-catcher-logo');
    if (!img || this.logoAlpha <= 0) return;

    const { dw, dh } = this.logoDims();
    const cy = this.logoCY + this.bobOffset;

    ctx.save();
    ctx.globalAlpha = this.logoAlpha;
    ctx.translate(160, cy);
    ctx.scale(this.logoScaleX, this.logoScaleY);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);


    ctx.restore();
  }

  destroy(): void {}
}

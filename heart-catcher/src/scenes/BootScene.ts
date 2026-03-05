import type { Scene } from '../engine/SceneManager';
import type { SceneManager } from '../engine/SceneManager';
import type { AssetLoader } from '../engine/AssetLoader';
import type { MainMenuScene } from './MainMenuScene';

/**
 * BootScene — loads critical assets (font image, placeholder sprites),
 * shows a loading progress bar, then transitions to MainMenuScene.
 */
export class BootScene implements Scene {
  private progress = 0;
  private done = false;

  constructor(
    private readonly assets: AssetLoader,
    private readonly sceneManager: SceneManager,
    private readonly mainMenuFactory: () => MainMenuScene,
  ) {}

  init(): void {
    this.progress = 0;
    this.done = false;
    this.loadAssets();
  }

  private async loadAssets(): Promise<void> {
    // These are all placeholder-safe: if an asset file doesn't exist,
    // AssetLoader.loadImage/loadAudio silently returns null.
    const assets: { key: string; url: string; type: 'image' | 'audio' }[] = [
      // Sprites
      { key: 'player-walk',      url: '/assets/sprites/danidu-walk.png',     type: 'image' },
      { key: 'heart-normal',     url: '/assets/sprites/heart-normal.png',    type: 'image' },
      { key: 'heart-golden',     url: '/assets/sprites/heart-golden.png',    type: 'image' },
      { key: 'heart-moving',     url: '/assets/sprites/heart-moving.png',    type: 'image' },
      { key: 'grass-rustle',     url: '/assets/sprites/grass-rustle.png',    type: 'image' },
      { key: 'soso-giggle',      url: '/assets/sprites/soso-giggle.png',     type: 'image' },
      { key: 'snow-shovel',      url: '/assets/sprites/snow-shovel.png',     type: 'image' },
      { key: 'memory-fragment',  url: '/assets/sprites/memory-fragment.png', type: 'image' },
      { key: 'powerup-icons',    url: '/assets/sprites/powerup-icons.png',   type: 'image' },
      // Tilesets
      { key: 'tileset-spring',   url: '/assets/tilesets/spring.png',         type: 'image' },
      { key: 'tileset-summer',   url: '/assets/tilesets/summer.png',         type: 'image' },
      { key: 'tileset-autumn',   url: '/assets/tilesets/autumn.png',         type: 'image' },
      { key: 'tileset-winter',   url: '/assets/tilesets/winter.png',         type: 'image' },
      // UI
      { key: 'scrapbook-cover',  url: '/assets/ui/scrapbook-cover.png',      type: 'image' },
      { key: 'scrapbook-page',   url: '/assets/ui/scrapbook-page.png',       type: 'image' },
      { key: 'stamp-gold',       url: '/assets/ui/stamp-gold.png',           type: 'image' },
      { key: 'polaroid-frame',   url: '/assets/ui/polaroid-frame.png',       type: 'image' },
      // Audio SFX
      { key: 'heart-find',       url: '/assets/audio/sfx/heart-find.ogg',       type: 'audio' },
      { key: 'grass-rustle',     url: '/assets/audio/sfx/grass-rustle.ogg',     type: 'audio' },
      { key: 'decoy-giggle',     url: '/assets/audio/sfx/decoy-giggle.ogg',     type: 'audio' },
      { key: 'shovel',           url: '/assets/audio/sfx/shovel.ogg',           type: 'audio' },
      { key: 'level-complete',   url: '/assets/audio/sfx/level-complete.ogg',   type: 'audio' },
      { key: 'page-turn',        url: '/assets/audio/sfx/page-turn.ogg',        type: 'audio' },
      { key: 'compass-tick',     url: '/assets/audio/sfx/compass-tick.ogg',     type: 'audio' },
      { key: 'powerup',          url: '/assets/audio/sfx/powerup.ogg',          type: 'audio' },
      { key: 'sweet-scent',      url: '/assets/audio/sfx/sweet-scent.ogg',      type: 'audio' },
      // Music
      { key: 'music-spring',     url: '/assets/audio/music/spring.ogg',         type: 'audio' },
      { key: 'music-summer',     url: '/assets/audio/music/summer.ogg',         type: 'audio' },
      { key: 'music-autumn',     url: '/assets/audio/music/autumn.ogg',         type: 'audio' },
      { key: 'music-winter',     url: '/assets/audio/music/winter.ogg',         type: 'audio' },
      { key: 'music-finale',     url: '/assets/audio/music/finale.ogg',         type: 'audio' },
      { key: 'music-scrapbook',  url: '/assets/audio/music/scrapbook.ogg',      type: 'audio' },
      // Photos
      ...Array.from({ length: 7 }, (_, i) => ({
        key: `photo-${i}`,
        url: `/assets/photos/memory-${String(i).padStart(2,'0')}.jpg`,
        type: 'image' as const,
      })),
    ];

    await this.assets.loadMany(assets, (loaded, total) => {
      this.progress = loaded / total;
    });

    this.done = true;
    this.sceneManager.switch(this.mainMenuFactory());
  }

  update(_dt: number): void {}

  render(ctx: CanvasRenderingContext2D): void {
    // Background
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, 320, 240);

    // Title
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Heart Catcher', 160, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    ctx.fillText('Loading...', 160, 118);

    // Progress bar
    const barW = 200;
    const barH = 8;
    const barX = (320 - barW) / 2;
    const barY = 130;
    ctx.strokeStyle = '#ff6b9d44';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(barX + 1, barY + 1, (barW - 2) * this.progress, barH - 2);

    ctx.textAlign = 'left';
  }

  destroy(): void {}
}

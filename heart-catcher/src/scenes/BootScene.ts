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
      { key: 'dancy-walk-s',     url: '/assets/sprites/dancy-walk-s.png',    type: 'image' },
      { key: 'dancy-walk-n',     url: '/assets/sprites/dancy-walk-n.png',    type: 'image' },
      { key: 'dancy-walk-e',     url: '/assets/sprites/dancy-walk-e.png',    type: 'image' },
      { key: 'dancy-walk-w',     url: '/assets/sprites/dancy-walk-w.png',    type: 'image' },
      { key: 'dancy-idle-w',     url: '/assets/sprites/dancy-idle-w.png',    type: 'image' },
      { key: 'dancy-idle-e',     url: '/assets/sprites/dancy-idle-e.png',    type: 'image' },
      { key: 'dancy-idle-s',     url: '/assets/sprites/dancy-idle-s.png',    type: 'image' },
      { key: 'dancy-idle-n',     url: '/assets/sprites/dancy-idle-n.png',    type: 'image' },
      { key: 'heart-normal',         url: '/assets/sprites/heart-normal.png',         type: 'image' },
      { key: 'heart-red',           url: '/assets/sprites/heart-red.png',           type: 'image' },
      { key: 'berry-decoy',         url: '/assets/sprites/berry-decoy.png',         type: 'image' },
      { key: 'heart-golden-finale', url: '/assets/sprites/heart-golden-finale.png',  type: 'image' },
      { key: 'heart-golden',     url: '/assets/sprites/heart-golden.png',    type: 'image' },
      { key: 'heart-moving',     url: '/assets/sprites/heart-moving.png',    type: 'image' },
      { key: 'grass-rustle',     url: '/assets/sprites/grass-rustle.png',    type: 'image' },
      { key: 'soso-giggle',      url: '/assets/sprites/soso-giggle.png',     type: 'image' },
      { key: 'snow-shovel',      url: '/assets/sprites/snow-shovel.png',     type: 'image' },
      { key: 'snow-pile',        url: '/assets/sprites/snow-pile.png',       type: 'image' },
      { key: 'powerup-run',      url: '/assets/sprites/powerup-run.png',    type: 'image' },
      { key: 'powerup-mower',    url: '/assets/sprites/powerup-mower.png',  type: 'image' },
      { key: 'powerup-scent',    url: '/assets/sprites/powerup-scent.png',  type: 'image' },
      { key: 'dancy-portrait',   url: '/assets/sprites/dancy-portrait.png',  type: 'image' },
      { key: 'soso-portrait',    url: '/assets/sprites/soso-portrait.png',   type: 'image' },
      { key: 'soso-memoji',      url: '/assets/sprites/soso-memoji.png',     type: 'image' },
      { key: 'envelope-open',    url: '/assets/sprites/envelope-open.png',   type: 'image' },
      { key: 'envelope-close',   url: '/assets/sprites/envelope-close.png',  type: 'image' },
      // Tree sprites (seasonal)
      { key: 'tree-spring-1',    url: '/assets/sprites/trees/tree-spring-1.png',  type: 'image' },
      { key: 'tree-spring-2',    url: '/assets/sprites/trees/tree-spring-2.png',  type: 'image' },
      { key: 'tree-spring-3',    url: '/assets/sprites/trees/tree-spring-3.png',  type: 'image' },
      { key: 'tree-summer-1',    url: '/assets/sprites/trees/tree-summer-1.png',  type: 'image' },
      { key: 'tree-summer-2',    url: '/assets/sprites/trees/tree-summer-2.png',  type: 'image' },
      { key: 'tree-summer-3',    url: '/assets/sprites/trees/tree-summer-3.png',  type: 'image' },
      { key: 'tree-autumn-1',    url: '/assets/sprites/trees/tree-autumn-1.png',  type: 'image' },
      { key: 'tree-autumn-2',    url: '/assets/sprites/trees/tree-autumn-2.png',  type: 'image' },
      { key: 'tree-autumn-3',    url: '/assets/sprites/trees/tree-autumn-3.png',  type: 'image' },
      { key: 'tree-winter-1',    url: '/assets/sprites/trees/tree-winter-1.png',  type: 'image' },
      { key: 'tree-winter-2',    url: '/assets/sprites/trees/tree-winter-2.png',  type: 'image' },
      { key: 'tree-winter-3',    url: '/assets/sprites/trees/tree-winter-3.png',  type: 'image' },
      { key: 'tree-finale-1',    url: '/assets/sprites/trees/tree-finale-1.png',  type: 'image' },
      { key: 'tree-finale-2',    url: '/assets/sprites/trees/tree-finale-2.png',  type: 'image' },
      { key: 'tree-finale-3',    url: '/assets/sprites/trees/tree-finale-3.png',  type: 'image' },
      { key: 'tree-finale-4',    url: '/assets/sprites/trees/tree-finale-4.png',  type: 'image' },
      { key: 'tree-finale-5',    url: '/assets/sprites/trees/tree-finale-5.png',  type: 'image' },
      { key: 'tree-finale-6',    url: '/assets/sprites/trees/tree-finale-6.png',  type: 'image' },
      // Bush sprites (seasonal)
      { key: 'bush-spring-1',  url: '/assets/sprites/bushes/bush-spring-1.png',  type: 'image' },
      { key: 'bush-spring-2',  url: '/assets/sprites/bushes/bush-spring-2.png',  type: 'image' },
      { key: 'bush-spring-3',  url: '/assets/sprites/bushes/bush-spring-3.png',  type: 'image' },
      { key: 'bush-summer-1',  url: '/assets/sprites/bushes/bush-summer-1.png',  type: 'image' },
      { key: 'bush-summer-2',  url: '/assets/sprites/bushes/bush-summer-2.png',  type: 'image' },
      { key: 'bush-summer-3',  url: '/assets/sprites/bushes/bush-summer-3.png',  type: 'image' },
      { key: 'bush-autumn-1',  url: '/assets/sprites/bushes/bush-autumn-1.png',  type: 'image' },
      { key: 'bush-autumn-2',  url: '/assets/sprites/bushes/bush-autumn-2.png',  type: 'image' },
      { key: 'bush-autumn-3',  url: '/assets/sprites/bushes/bush-autumn-3.png',  type: 'image' },
      { key: 'bush-winter-1',  url: '/assets/sprites/bushes/bush-winter-1.png',  type: 'image' },
      { key: 'bush-winter-2',  url: '/assets/sprites/bushes/bush-winter-2.png',  type: 'image' },
      { key: 'bush-winter-3',  url: '/assets/sprites/bushes/bush-winter-3.png',  type: 'image' },
      { key: 'bush-finale-1',  url: '/assets/sprites/bushes/bush-finale-1.png',  type: 'image' },
      { key: 'bush-finale-2',  url: '/assets/sprites/bushes/bush-finale-2.png',  type: 'image' },
      { key: 'bush-finale-3',  url: '/assets/sprites/bushes/bush-finale-3.png',  type: 'image' },
      { key: 'bush-finale-4',  url: '/assets/sprites/bushes/bush-finale-4.png',  type: 'image' },
      { key: 'bush-finale-5',  url: '/assets/sprites/bushes/bush-finale-5.png',  type: 'image' },
      { key: 'bush-finale-6',  url: '/assets/sprites/bushes/bush-finale-6.png',  type: 'image' },
      // Fern sprites (path borders, all seasons)
      { key: 'fern-1',         url: '/assets/sprites/bushes/fern-1.png',         type: 'image' },
      { key: 'fern-2',         url: '/assets/sprites/bushes/fern-2.png',         type: 'image' },
      { key: 'fern-3',         url: '/assets/sprites/bushes/fern-3.png',         type: 'image' },
      { key: 'fern-4',         url: '/assets/sprites/bushes/fern-4.png',         type: 'image' },
      { key: 'fern-5',         url: '/assets/sprites/bushes/fern-5.png',         type: 'image' },
      { key: 'fern-6',         url: '/assets/sprites/bushes/fern-6.png',         type: 'image' },
      // Seasonal ground textures
      { key: 'autumn-grass',     url: '/assets/sprites/autumn-grass.png',    type: 'image' },
      { key: 'snow-ground',      url: '/assets/sprites/snow-ground.png',     type: 'image' },
      // Tilesets
      { key: 'tileset-spring',   url: '/assets/tilesets/spring.png',         type: 'image' },
      { key: 'tileset-summer',   url: '/assets/tilesets/summer.png',         type: 'image' },
      { key: 'tileset-autumn',   url: '/assets/tilesets/autumn.png',         type: 'image' },
      { key: 'tileset-winter',   url: '/assets/tilesets/winter.png',         type: 'image' },
      // Chapter photos
      { key: 'photo-ch1',  url: '/assets/photos/ch-1.jpg',  type: 'image' },
      { key: 'photo-ch3',  url: '/assets/photos/ch-3.jpg',  type: 'image' },
      { key: 'photo-ch13', url: '/assets/photos/ch-13.jpg', type: 'image' },
      { key: 'photo-ch16', url: '/assets/photos/ch-16.jpg', type: 'image' },
      { key: 'photo-ch20', url: '/assets/photos/ch-20.jpg', type: 'image' },
      // UI
      { key: 'heart-catcher-logo', url: '/assets/ui/logo.png',               type: 'image' },
      { key: 'scrapbook-cover',  url: '/assets/ui/scrapbook-cover.png',      type: 'image' },
      { key: 'scrapbook-page',   url: '/assets/ui/scrapbook-page.png',       type: 'image' },
      { key: 'stamp-gold',       url: '/assets/ui/stamp-gold.png',           type: 'image' },
      { key: 'polaroid-frame',   url: '/assets/ui/polaroid-frame.png',       type: 'image' },
      // Audio SFX
      { key: 'menu-select',        url: '/assets/audio/sfx/menu-select.mp3',        type: 'audio' },
      { key: 'menu-confirm',       url: '/assets/audio/sfx/menu-confirm.mp3',       type: 'audio' },
      { key: 'level-select-nav',   url: '/assets/audio/sfx/level-select-nav.wav',   type: 'audio' },
      { key: 'scrapbook-nav',      url: '/assets/audio/sfx/scrapbook-nav.wav',      type: 'audio' },
      { key: 'footsteps-forest', url: '/assets/audio/sfx/footsteps-forest.wav', type: 'audio' },
      { key: 'footsteps-snow',   url: '/assets/audio/sfx/footsteps-snow.wav',   type: 'audio' },
      { key: 'footsteps-finale', url: '/assets/audio/sfx/footsteps-finale.wav', type: 'audio' },
      { key: 'heart-find',       url: '/assets/audio/sfx/heart-find.ogg',       type: 'audio' },
      { key: 'grass-rustle',     url: '/assets/audio/sfx/grass-rustle.ogg',     type: 'audio' },
      { key: 'decoy-giggle',     url: '/assets/audio/sfx/decoy-giggle.wav',     type: 'audio' },
      { key: 'menu-back',        url: '/assets/audio/sfx/menu-back.mp3',        type: 'audio' },
      { key: 'shovel',           url: '/assets/audio/sfx/shovel.ogg',           type: 'audio' },
      { key: 'level-complete',   url: '/assets/audio/sfx/level-complete.mp3',   type: 'audio' },
      { key: 'victory-finale',   url: '/assets/audio/sfx/victory-finale.mp3',   type: 'audio' },
      { key: 'gift-confetti',    url: '/assets/audio/sfx/gift-confetti.mp3',    type: 'audio' },
      { key: 'confetti-pop',     url: '/assets/audio/sfx/confetti-pop.mp3',     type: 'audio' },
      { key: 'birthday-card',    url: '/assets/audio/sfx/birthday-card.mp3',    type: 'audio' },
      { key: 'menu-theme',       url: '/assets/audio/sfx/menu-theme.mp3',       type: 'audio' },
      { key: 'page-turn',        url: '/assets/audio/sfx/page-turn.mp3',        type: 'audio' },
      { key: 'compass-tick',     url: '/assets/audio/sfx/compass-tick.ogg',     type: 'audio' },
      { key: 'powerup',          url: '/assets/audio/sfx/powerup.mp3',          type: 'audio' },
      { key: 'sweet-scent',      url: '/assets/audio/sfx/sweet-scent.ogg',      type: 'audio' },
      // Music
      { key: 'music-title',      url: '/assets/audio/music/title.mp3',          type: 'audio' },
      { key: 'music-spring',     url: '/assets/audio/music/spring.mp3',         type: 'audio' },
      { key: 'music-summer',     url: '/assets/audio/music/summer.mp3',         type: 'audio' },
      { key: 'music-autumn',     url: '/assets/audio/music/autumn.mp3',         type: 'audio' },
      { key: 'music-winter',     url: '/assets/audio/music/winter.mp3',         type: 'audio' },
      { key: 'music-finale',     url: '/assets/audio/music/finale.mp3',         type: 'audio' },
      { key: 'music-end-credits',url: '/assets/audio/music/end-credits.mp3',    type: 'audio' },
      { key: 'music-scrapbook',  url: '/assets/audio/music/scrapbook.ogg',      type: 'audio' },
      { key: 'ambient-forest',   url: '/assets/audio/music/ambient-forest.mp3', type: 'audio' },
      { key: 'ambient-summer',   url: '/assets/audio/music/ambient-summer.mp3', type: 'audio' },
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

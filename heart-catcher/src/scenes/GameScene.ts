import type { Scene } from '../engine/SceneManager';
import type { SceneManager } from '../engine/SceneManager';
import type { InputManager } from '../engine/InputManager';
import type { AudioEngine } from '../engine/AudioEngine';
import type { AssetLoader } from '../engine/AssetLoader';
import type { TweenEngine } from '../engine/TweenEngine';
import type { SaveManager } from '../systems/SaveManager';
import { PlayerController } from '../systems/PlayerController';
import { TilemapRenderer } from '../systems/TilemapRenderer';
import { CollisionMap } from '../systems/CollisionMap';
import { CameraController } from '../systems/CameraController';
import { HeartManager } from '../systems/HeartManager';
import { CompassSystem } from '../systems/CompassSystem';
import { ParticleEmitter } from '../systems/ParticleEmitter';
import { PowerupSystem } from '../systems/PowerupSystem';
import { DecoySystem } from '../systems/DecoySystem';
import { FogSystem } from '../systems/FogSystem';
import { HintSystem } from '../systems/HintSystem';
import { HUD } from '../ui/HUD';
import { DialogueBox } from '../ui/DialogueBox';
import { EventBus } from '../engine/EventBus';
import { getLevelById } from '../data/levels/index';
import type { LevelConfig } from '../data/types';
import { PowerupType } from '../data/types';
import { tileToWorld } from '../systems/CollisionMap';
import type { ScrapbookScene } from './ScrapbookScene';

/**
 * Recolors the green grass base baked into tree/bush sprite PNGs to autumn
 * amber/orange tones, so they blend with the autumn ground texture.
 */
function recolorGreenToAmber(img: HTMLImageElement): CanvasImageSource {
  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth  || img.width;
  canvas.height = img.naturalHeight || img.height;
  const c = canvas.getContext('2d')!;
  c.drawImage(img, 0, 0);
  const id = c.getImageData(0, 0, canvas.width, canvas.height);
  const d  = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 20) continue; // skip transparent
    const r = d[i], g = d[i + 1], b = d[i + 2];
    // Detect greenish pixels: green channel dominant over red and blue
    if (g > r * 1.25 && g > b * 1.15 && g > 60) {
      const brightness = g / 200;
      d[i]     = Math.min(255, Math.round(185 * brightness + 30)); // warm orange-red
      d[i + 1] = Math.min(255, Math.round( 90 * brightness + 15)); // golden
      d[i + 2] = Math.round(10 * brightness);                      // minimal blue
    }
  }
  c.putImageData(id, 0, 0);
  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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
}

/**
 * GameScene — primary gameplay orchestrator.
 * Owns all game systems, wires them together, and coordinates level flow.
 */
export class GameScene implements Scene {
  private levelId: number;
  private levelConfig: LevelConfig | null = null;

  // Systems
  private tilemap!: TilemapRenderer;
  private collision!: CollisionMap;
  private camera!: CameraController;
  private player!: PlayerController;
  private hearts!: HeartManager;
  private compass!: CompassSystem;
  private particles!: ParticleEmitter;
  private powerups!: PowerupSystem;
  private decoys!: DecoySystem;
  private fog!: FogSystem;
  private hints!: HintSystem;
  private hud!: HUD;
  private dialogue!: DialogueBox;

  private levelStartTime = 0;
  private masterCatcher = true; // will be set false if decoy triggered
  private levelCompleteHandled = false;
  private frameCount = 0;

  // Completion overlay
  private completion: {
    phase: 'in' | 'hold' | 'out';
    timer: number;
    heartsFound: number;
    heartsRequired: number;
    heartScale: number;
    heartScaleV: number;
    sparkles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string }[];
    elapsed: number;
  } | null = null;

  private readonly POWERUP_HINTS: Partial<Record<PowerupType, string>> = {
    [PowerupType.RunningShoes]:   'Running Shoes! Hold Shift to dash through the forest.',
    [PowerupType.SweetScent]:     'Sweet Scent! Press Q to reveal nearby hearts for a moment.',
    [PowerupType.Mower]:          'Mower! Press E to clear all tall grass around you at once.',
  };

  // Intro message queue (shown at level start via DialogueBox)
  private introQueue: string[] = [];
  private introIndex = 0;
  private introWasVisible = false;

  constructor(
    levelId: number,
    private readonly sceneManager: SceneManager,
    private readonly input: InputManager,
    private readonly audio: AudioEngine,
    private readonly assets: AssetLoader,
    private readonly tweens: TweenEngine,
    private readonly saveManager: SaveManager,
    private readonly scrapbookFactory: (data: unknown) => ScrapbookScene,
    private readonly mainMenuFactory: () => Scene,
  ) {
    this.levelId = levelId;
  }

  init(): void {
    // Clear all held keys from previous scene so player doesn't start moving
    this.input.clearAll();

    this.levelConfig = getLevelById(this.levelId) ?? null;
    if (!this.levelConfig) {
      console.error(`Level ${this.levelId} not found`);
      return;
    }

    const cfg = this.levelConfig;
    this.levelStartTime = Date.now();
    this.levelCompleteHandled = false;
    this.masterCatcher = true;

    // Build systems
    this.collision = new CollisionMap();
    this.collision.load(cfg.map);

    this.camera = new CameraController();
    this.camera.setBounds(cfg.map.width, cfg.map.height);

    this.tilemap = new TilemapRenderer(this.assets);
    this.tilemap.loadMap(cfg.map);

    // Spring and finale trees are larger; other seasons use default size
    const treeSeason = this.getSeason();
    this.tilemap.setTreeSpriteSize(treeSeason === 'spring' || treeSeason === 'finale' ? 50 : 40);

    // Seasonal ground textures + sprite post-processing
    const season = this.getSeason();
    const isAutumn = season === 'autumn';
    const isWinter = season === 'winter';
    let groundTex: HTMLImageElement | null = null;
    if (isAutumn) groundTex = this.assets.getImage('autumn-grass') ?? null;
    else if (isWinter) groundTex = this.assets.getImage('snow-ground') ?? null;
    this.tilemap.setGroundTexture(groundTex);
    this.tilemap.setSpritePostProcess(isAutumn ? recolorGreenToAmber : null);

    this.tilemap.setTreeSprites(this.getTreeSprites());
    this.tilemap.setBushSprites(this.getBushSprites());
    this.tilemap.setFernSprites(this.getFernSprites());

    this.particles = new ParticleEmitter();

    this.hearts = new HeartManager(this.assets, this.tweens, this.particles, this.audio, this.collision);
    this.hearts.initLevel(cfg.hearts, cfg.heartsRequired);
    if (this.levelId === 22) {
      this.hearts.setHeartSprite(this.assets.getImage('heart-golden-finale'));
    }

    this.compass = new CompassSystem(this.audio);

    this.player = new PlayerController(cfg.playerStart, this.input, this.tweens, this.collision, this.assets);
    this.player.loadSprite(this.assets);

    this.decoys = new DecoySystem(this.assets, this.audio);
    this.decoys.init(cfg.decoys ?? []);

    this.fog = new FogSystem(this.assets, this.audio, this.collision);
    this.fog.init(cfg.snowTiles ?? [], cfg.fogEnabled ?? false, cfg.fogPunchOut ?? true);

    this.powerups = new PowerupSystem(this.assets, this.audio, this.hearts);
    this.powerups.init(cfg.powerups);

    this.hints = new HintSystem();
    this.hints.init(cfg.hintText);

    this.hud = new HUD();
    this.hud.setLevelName(cfg.displayName);
    this.hud.setHearts(0, cfg.heartsRequired);
    this.hud.setHeartSprite(this.assets.getImage('heart-red'));

    this.dialogue = new DialogueBox();
    this.dialogue.setPortrait(this.assets.getImage('soso-portrait'));

    // Snap camera to player start
    this.camera.snapTo(
      tileToWorld(cfg.playerStart.tx),
      tileToWorld(cfg.playerStart.ty),
    );

    // Wire up events
    EventBus.on('heart-found', this.onHeartFound);
    EventBus.on('level-complete', this.onLevelComplete);
    EventBus.on('decoy-triggered', this.onDecoyTriggered);
    EventBus.on('show-hint', this.onShowHint);
    EventBus.on('powerup-collected', this.onPowerupCollected);
    EventBus.on('player-moved', this.onPlayerMoved);

    // Queue intro messages for this level
    this.introQueue = cfg.introMessages ?? [];
    this.introIndex = 0;
    this.introWasVisible = false;
    if (this.introQueue.length > 0) {
      this.dialogue.show(this.introQueue[0]);
    }

    // Start music + ambient layer
    this.audio.playMusic(cfg.musicKey);
    if (season === 'spring' || season === 'autumn') {
      this.audio.playAmbient('ambient-forest');
    } else if (season === 'summer') {
      this.audio.playAmbient('ambient-summer');
    } else {
      this.audio.stopAmbient(0.5);
    }

    // Flush any stale input from the previous scene (e.g. Z that dismissed scrapbook)
    // so it doesn't immediately trigger interactions on the first frame.
    this.input.flush();
  }

  private getSeason(): string {
    if (this.levelId <= 5)       return 'spring';
    if (this.levelId <= 12)      return 'summer';
    if (this.levelId <= 18)      return 'autumn';
    if (this.levelId <= 21)      return 'winter';
    return 'finale';
  }

  private getTreeSprites(): HTMLImageElement[] {
    const season = this.getSeason();
    const count = season === 'finale' ? 6 : 3;
    return Array.from({ length: count }, (_, i) => i + 1).flatMap(n => {
      const img = this.assets.getImage(`tree-${season}-${n}`);
      return img ? [img] : [];
    });
  }

  private getBushSprites(): HTMLImageElement[] {
    const season = this.getSeason();
    const count = season === 'finale' ? 6 : 3;
    return Array.from({ length: count }, (_, i) => i + 1).flatMap(n => {
      const img = this.assets.getImage(`bush-${season}-${n}`);
      return img ? [img] : [];
    });
  }

  private getFernSprites(): HTMLImageElement[] {
    return [1, 2, 3, 4, 5, 6].flatMap(n => {
      const img = this.assets.getImage(`fern-${n}`);
      return img ? [img] : [];
    });
  }

  private onHeartFound = (data: { found: number; required: number }): void => {
    this.hud.setHearts(data.found, data.required);
  };

  private onLevelComplete = (): void => {
    if (this.levelCompleteHandled) return;
    this.levelCompleteHandled = true;

    this.audio.stopMusic(1.5);
    this.audio.stopAmbient(1.5);
    this.audio.playSFX(this.levelId === 22 ? 'victory-finale' : 'level-complete');

    const sparkles: typeof this.completion extends null ? never : NonNullable<typeof this.completion>['sparkles'] = [];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      const maxL = 0.8 + Math.random() * 0.6;
      sparkles.push({
        x: 160, y: 120,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxL, maxLife: maxL,
        color: i % 3 === 0 ? '#ff6b9d' : i % 3 === 1 ? '#ffd700' : '#ffffff',
      });
    }

    this.completion = {
      phase: 'in',
      timer: 0,
      heartsFound: this.hearts.foundHearts,
      heartsRequired: this.hearts.totalHearts,
      heartScale: 0.4,
      heartScaleV: 0,
      sparkles,
      elapsed: Date.now() - this.levelStartTime,
    };
  };

  private onDecoyTriggered = (): void => {
    this.masterCatcher = false;
  };

  private onShowHint = (data: { text: string }): void => {
    this.dialogue.show(data.text, () => this.hints.dismiss());
  };

  private onPowerupCollected = (data: { type: PowerupType }): void => {
    const hint = this.POWERUP_HINTS[data.type];
    if (hint && !this.dialogue.isVisible) this.dialogue.show(hint);
  };

  private onPlayerMoved = (): void => {
    const season = this.getSeason();
    if (season === 'spring' || season === 'summer' || season === 'autumn') {
      this.audio.playSFX('footsteps-forest', 0.4);
    } else if (season === 'winter') {
      this.audio.playSFX('footsteps-snow', 0.7);
    } else if (season === 'finale') {
      this.audio.playSFX('footsteps-finale', 0.7);
    }
  };

  update(dt: number): void {
    if (!this.levelConfig) return;

    this.frameCount++;
    this.input.pollGamepad();
    this.tweens.update(dt);
    this.player.update(dt);

    // Handle interact input
    if (!this.player.isBusy && this.input.isActionJustPressed() && !this.dialogue.isVisible) {
      const facingTile = this.player.facingTile;

      // Check snow shovel first
      if (this.fog.isSnowTile(facingTile)) {
        this.fog.shovel(facingTile);
      } else if (this.decoys.isDecoy(facingTile)) {
        this.decoys.trigger(facingTile);
      } else {
        this.hearts.interact(facingTile);
      }
    }

    // Dismiss dialogue
    if (this.dialogue.isVisible && this.input.isActionJustPressed()) {
      this.dialogue.dismiss();
      this.hints.dismiss();
    }

    // Powerup activation (Q = SweetScent, E = Mower) — not during dialogue
    if (!this.dialogue.isVisible) {
      const px = this.player.worldX;
      const py = this.player.worldY;
      if (this.input.isScentJustPressed()) {
        this.powerups.activateSweetScent(px, py);
      }
      if (this.input.isMowerJustPressed()) {
        if (this.powerups.activateMower()) {
          this.powerups.useMower(this.player.tilePos);
        }
      }
    }

    // ESC → back to main menu (level progress is not lost; only saves on level complete)
    if (this.input.isJustPressed('Escape')) {
      this.audio.playSFX('menu-back', 0.8);
      this.audio.stopAmbient(0.5);
      this.sceneManager.switch(this.mainMenuFactory(), { skipIntro: true });
    }

    if (this.input.isDown('MetaLeft', 'MetaRight') && this.input.isJustPressed('KeyD')) {
      EventBus.emit('level-complete', {});
    }

    const px = this.player.worldX;
    const py = this.player.worldY;
    const season = this.levelConfig?.season ?? '';

    // Leaf trail on movement for autumn and spring
    if (this.player.isBusy && this.frameCount % 3 === 0) {
      if (season === 'autumn' || season === 'spring') {
        this.particles.leafTrail(this.player.renderX, this.player.renderY, season);
      }
    }

    this.camera.follow(px, py);
    this.camera.update(dt);

    this.hearts.update(dt, px, py);
    this.compass.update(dt, px, py, this.hearts.getActiveHeartPositions());
    this.particles.update(dt);
    this.powerups.update(dt, px, py, this.input.isRunDown());
    this.player.setRunEnabled(this.powerups.has(PowerupType.RunningShoes));
    this.decoys.update(dt);
    this.fog.update(dt);
    this.hints.update(dt);
    this.dialogue.update(dt);

    // Advance intro message queue when current message is dismissed
    const dialogueNowVisible = this.dialogue.isVisible;
    if (this.introWasVisible && !dialogueNowVisible && this.introIndex < this.introQueue.length - 1) {
      this.introIndex++;
      this.dialogue.show(this.introQueue[this.introIndex]);
    }
    this.introWasVisible = this.dialogue.isVisible;

    // Completion overlay update
    if (this.completion) {
      const c = this.completion;
      c.timer += dt;

      // Spring-physics heart scale
      const target = 1;
      const stiffness = 280, damping = 18;
      c.heartScaleV += (target - c.heartScale) * stiffness * dt - c.heartScaleV * damping * dt;
      c.heartScale += c.heartScaleV * dt;

      // Update sparkles
      for (const s of c.sparkles) {
        s.vy += 60 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
      }
      c.sparkles = c.sparkles.filter(s => s.life > 0);

      if (c.phase === 'in' && c.timer >= 0.5) { c.phase = 'hold'; c.timer = 0; }
      if (c.phase === 'hold' && c.timer >= 2.0) { c.phase = 'out'; c.timer = 0; }
      if (c.phase === 'out' && c.timer >= 0.4) {
        const scrapbookData = {
          levelId: this.levelId,
          timeMs: c.elapsed,
          heartsFound: c.heartsFound,
          masterCatcher: this.masterCatcher,
          nextLevelId: this.levelId + 1,
        };
        this.completion = null;
        if (this.levelId === 22) {
          this.audio.playSFX('gift-confetti', 0.9, 2);
          this.audio.playSFX('confetti-pop', 0.85);
        }
        const scrapbook = this.scrapbookFactory(scrapbookData);
        this.sceneManager.push(scrapbook, scrapbookData);
      }
    }

    this.input.flush();
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear
    ctx.fillStyle = '#1a2b1a';
    ctx.fillRect(0, 0, 320, 240);
    ctx.imageSmoothingEnabled = false;

    const cam = this.camera;

    // Layer 1 & 2: ground + decoration
    this.tilemap.renderBelow(ctx, cam);

    // Layer 3: snow overlays (winter, below player)
    this.fog.renderSnow(ctx, cam.x, cam.y);

    // Y-sorted layer: obstacles, powerups, player, decoys
    // Collect all Y-sortable objects
    const objects: { y: number; draw: () => void }[] = [];

    // Tile obstacles (they're in the tilemap, drawn as a layer at ~player-Y-sort level)
    objects.push({
      y: -9999, // always drawn first in this group
      draw: () => this.tilemap.renderObstacles(ctx, cam),
    });

    // Player
    objects.push({
      y: this.player.sortY,
      draw: () => this.player.render(ctx, cam),
    });

    // Powerup sprites
    objects.push({
      y: 9999, // powerups render after player
      draw: () => this.powerups.render(ctx, cam.x, cam.y),
    });

    // Heart reveals + grass anims
    objects.push({
      y: 9999,
      draw: () => this.hearts.render(ctx, cam.x, cam.y),
    });

    // Decoy giggles
    objects.push({
      y: 9999,
      draw: () => this.decoys.render(ctx, cam.x, cam.y),
    });

    // Sort by Y and draw
    objects.sort((a, b) => a.y - b.y);
    for (const obj of objects) obj.draw();

    // Particles (above world objects)
    this.particles.render(ctx, cam.x, cam.y);

    // Layer 4: overhead (canopies — always on top of world)
    this.tilemap.renderOverhead(ctx, cam);

    // Fog / winter darkness
    const playerScreenX = Math.round(this.player.renderX - cam.x);
    const playerScreenY = Math.round(this.player.renderY - cam.y);
    this.fog.renderFog(ctx, playerScreenX, playerScreenY);

    // HUD (drawn last — always on top)
    this.hud.render(ctx, this.compass, this.powerups);

    // Dialogue box
    this.dialogue.render(ctx);

    // Completion overlay
    if (this.completion) {
      this.renderCompletionOverlay(ctx);
    }
  }

  private renderCompletionOverlay(ctx: CanvasRenderingContext2D): void {
    const c = this.completion!;

    const inT  = c.phase === 'in'   ? Math.min(1, c.timer / 0.5) : 1;
    const outT = c.phase === 'out'  ? Math.min(1, c.timer / 0.4) : 0;
    const alpha = (inT - outT);

    // Dark backdrop
    ctx.save();
    ctx.globalAlpha = alpha * 0.78;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 320, 240);
    ctx.globalAlpha = 1;

    // Card
    const cardW = 200, cardH = 110;
    const cardX = (320 - cardW) / 2;
    const cardY = (240 - cardH) / 2;
    const cardScale = 0.6 + 0.4 * inT - 0.4 * outT;

    ctx.globalAlpha = alpha;
    ctx.translate(160, 120);
    ctx.scale(cardScale, cardScale);
    ctx.translate(-160, -120);

    // Card background
    ctx.fillStyle = '#1a1030';
    ctx.strokeStyle = '#ff6b9d';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cardX, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    // "Level Complete!" title
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Level Complete!', 160, cardY + 26);

    // Heart counter with spring scale
    const hs = c.heartScale;
    ctx.save();
    ctx.translate(160, cardY + 60);
    ctx.scale(hs, hs);
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`❤ ${c.heartsFound} / ${c.heartsRequired}`, 0, 0);
    ctx.restore();

    // Subtitle
    ctx.fillStyle = '#aaaacc';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('all hearts found', 160, cardY + 82);

    // Sparkles
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const s of c.sparkles) {
      const t = s.life / s.maxLife;
      ctx.globalAlpha = alpha * t;
      ctx.fillStyle = s.color;
      const sz = Math.max(1, Math.round(2 + t * 2));
      ctx.fillRect(Math.round(s.x - sz / 2), Math.round(s.y - sz / 2), sz, sz);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  destroy(): void {
    EventBus.off('heart-found', this.onHeartFound);
    EventBus.off('level-complete', this.onLevelComplete);
    EventBus.off('decoy-triggered', this.onDecoyTriggered);
    EventBus.off('show-hint', this.onShowHint);
    EventBus.off('powerup-collected', this.onPowerupCollected);
    EventBus.off('player-moved', this.onPlayerMoved);
    this.hints.destroy();
  }
}

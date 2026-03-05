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
import { tileToWorld } from '../systems/CollisionMap';
import type { ScrapbookScene } from './ScrapbookScene';

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
  ) {
    this.levelId = levelId;
  }

  init(): void {
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

    this.particles = new ParticleEmitter();

    this.hearts = new HeartManager(this.assets, this.tweens, this.particles, this.audio, this.collision);
    this.hearts.initLevel(cfg.hearts, cfg.heartsRequired);

    this.compass = new CompassSystem(this.audio);

    this.player = new PlayerController(cfg.playerStart, this.input, this.tweens, this.collision, this.assets);
    this.player.loadSprite(this.assets);

    this.decoys = new DecoySystem(this.assets, this.audio);
    this.decoys.init(cfg.decoys ?? []);

    this.fog = new FogSystem(this.assets, this.audio, this.collision);
    this.fog.init(cfg.snowTiles ?? [], cfg.fogEnabled ?? false);

    this.powerups = new PowerupSystem(this.assets, this.audio, this.hearts);
    this.powerups.init(cfg.powerups);

    this.hints = new HintSystem();
    this.hints.init(cfg.hintText);

    this.hud = new HUD();
    this.hud.setLevelName(cfg.displayName);
    this.hud.setHearts(0, cfg.heartsRequired);

    this.dialogue = new DialogueBox();

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

    // Queue intro messages for this level
    this.introQueue = cfg.introMessages ?? [];
    this.introIndex = 0;
    this.introWasVisible = false;
    if (this.introQueue.length > 0) {
      this.dialogue.show(this.introQueue[0]);
    }

    // Start music
    this.audio.playMusic(cfg.musicKey);
  }

  private onHeartFound = (data: { found: number; required: number }): void => {
    this.hud.setHearts(data.found, data.required);
  };

  private onLevelComplete = (): void => {
    if (this.levelCompleteHandled) return;
    this.levelCompleteHandled = true;

    this.audio.playSFX('level-complete');
    const elapsed = Date.now() - this.levelStartTime;

    // Small delay for celebration, then open scrapbook
    setTimeout(() => {
      const scrapbookData = {
        levelId: this.levelId,
        timeMs: elapsed,
        heartsFound: this.hearts.foundHearts,
        masterCatcher: this.masterCatcher,
        nextLevelId: this.levelId + 1,
      };
      const scrapbook = this.scrapbookFactory(scrapbookData);
      this.sceneManager.push(scrapbook, scrapbookData);
    }, 1500);
  };

  private onDecoyTriggered = (): void => {
    this.masterCatcher = false;
  };

  private onShowHint = (data: { text: string }): void => {
    this.dialogue.show(data.text, () => this.hints.dismiss());
  };

  update(dt: number): void {
    if (!this.levelConfig) return;

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
        this.powerups.activateMower();
      }
    }

    // Scrapbook shortcut (X key)
    if (this.input.isMenuDown()) {
      const shortcutData = { levelId: 0, timeMs: 0, heartsFound: 0, masterCatcher: false, nextLevelId: this.levelId };
      const scrapbook = this.scrapbookFactory(shortcutData);
      this.sceneManager.push(scrapbook, shortcutData);
    }

    const px = this.player.worldX;
    const py = this.player.worldY;

    this.camera.follow(px, py);
    this.camera.update(dt);

    this.hearts.update(dt, px, py);
    this.compass.update(dt, px, py, this.hearts.getActiveHeartPositions());
    this.particles.update(dt);
    this.powerups.update(dt, px, py, this.input.isRunDown());
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
  }

  destroy(): void {
    EventBus.off('heart-found', this.onHeartFound);
    EventBus.off('level-complete', this.onLevelComplete);
    EventBus.off('decoy-triggered', this.onDecoyTriggered);
    EventBus.off('show-hint', this.onShowHint);
    this.hints.destroy();
  }
}

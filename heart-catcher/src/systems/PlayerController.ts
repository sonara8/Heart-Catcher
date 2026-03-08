import type { InputManager } from '../engine/InputManager';
import type { TweenEngine } from '../engine/TweenEngine';
import type { CollisionMap } from './CollisionMap';
import type { CameraController } from './CameraController';
import type { AssetLoader } from '../engine/AssetLoader';
import { AnimationController } from './AnimationController';
import { TILE_SIZE, tileToWorld } from './CollisionMap';
import { Easing } from '../engine/TweenEngine';
import { EventBus } from '../engine/EventBus';
import type { TilePos } from '../data/types';

const MOVE_DURATION_NORMAL = 0.15; // seconds
const MOVE_DURATION_RUN = 0.09;

// 8-directional animation names → spritesheet row
// Row 0=S, 1=SE, 2=E, 3=NE, 4=N, 5=NW, 6=W, 7=SW
const DIR_TO_ANIM: Record<string, string> = {
  '0,1': 'walk-s', '1,1': 'walk-se', '1,0': 'walk-e',
  '1,-1': 'walk-ne', '0,-1': 'walk-n', '-1,-1': 'walk-nw',
  '-1,0': 'walk-w', '-1,1': 'walk-sw',
};
const DIR_TO_IDLE: Record<string, string> = {
  '0,1': 'idle-s', '1,1': 'idle-se', '1,0': 'idle-e',
  '1,-1': 'idle-ne', '0,-1': 'idle-n', '-1,-1': 'idle-nw',
  '-1,0': 'idle-w', '-1,1': 'idle-sw',
};

type State = 'IDLE' | 'MOVING' | 'INTERACTING';

export class PlayerController {
  worldX: number;
  worldY: number;

  private state: State = 'IDLE';
  private currentTile: TilePos;
  private facingDx = 0;
  private facingDy = 1;
  private activeTweenId = -1;
  private touchCooldown = 0;
  private isRunning = false;
  private runEnabled = false;

  readonly anim = new AnimationController();
  private sprites: Map<string, HTMLImageElement> = new Map();

  // Visual position (may differ from world position during tween)
  renderX: number;
  renderY: number;

  constructor(
    startTile: TilePos,
    private readonly input: InputManager,
    private readonly tweens: TweenEngine,
    private readonly collision: CollisionMap,
    private readonly assets: AssetLoader,
  ) {
    this.currentTile = { ...startTile };
    this.worldX = tileToWorld(startTile.tx);
    this.worldY = tileToWorld(startTile.ty);
    this.renderX = this.worldX;
    this.renderY = this.worldY;
    this.setupAnimations();
  }

  private setupAnimations(): void {
    // Static single-frame images per direction — no spritesheet columns
    const dirs = ['s','se','e','ne','n','nw','w','sw'];
    dirs.forEach(dir => {
      this.anim.define(`walk-${dir}`, { frames: [0], fps: 9, loop: true });
      this.anim.define(`idle-${dir}`, { frames: [0], fps: 4, loop: true });
    });
    this.anim.play('idle-s');
  }

  loadSprite(assets: AssetLoader): void {
    const keys = ['dancy-walk-s','dancy-walk-n','dancy-walk-e','dancy-walk-w','dancy-idle-w','dancy-idle-e','dancy-idle-s','dancy-idle-n'];
    for (const k of keys) {
      const img = assets.getImage(k);
      if (img) this.sprites.set(k, img);
    }
  }

  get tilePos(): TilePos { return { ...this.currentTile }; }
  get facingTile(): TilePos {
    return { tx: this.currentTile.tx + this.facingDx, ty: this.currentTile.ty + this.facingDy };
  }
  get isBusy(): boolean { return this.state !== 'IDLE'; }

  update(dt: number): void {
    this.anim.update(dt);
    this.input.pollGamepad();
    this.isRunning = this.runEnabled && this.input.isRunDown();

    if (this.touchCooldown > 0) this.touchCooldown -= dt;

    if (this.state === 'IDLE') {
      this.handleIdleInput();
    }
    // MOVING state is driven by tweens; nothing to poll
  }

  private handleIdleInput(): void {
    let dx = this.input.axisX();
    let dy = this.input.axisY();

    // Touch tap-to-walk
    const touch = this.input.getTouchTarget();
    if (!dx && !dy && touch && this.touchCooldown <= 0) {
      const targetTx = Math.floor(touch.x / TILE_SIZE);
      const targetTy = Math.floor(touch.y / TILE_SIZE);
      // Only step in the raw direction
      if (targetTx !== this.currentTile.tx || targetTy !== this.currentTile.ty) {
        dx = Math.sign(targetTx - this.currentTile.tx);
        dy = Math.sign(targetTy - this.currentTile.ty);
        // If we've reached destination clear it
        if (targetTx === this.currentTile.tx + dx && targetTy === this.currentTile.ty + dy) {
          if (targetTx === this.currentTile.tx && targetTy === this.currentTile.ty) {
            this.input.clearTouchTarget();
          }
        }
      } else {
        this.input.clearTouchTarget();
      }
    }

    // Clamp diagonals to ±1
    dx = Math.sign(dx);
    dy = Math.sign(dy);

    if (dx !== 0 || dy !== 0) {
      this.facingDx = dx;
      this.facingDy = dy;
      const dirKey = `${dx},${dy}`;
      this.anim.play(DIR_TO_ANIM[dirKey] ?? 'walk-s');

      const nextTile: TilePos = {
        tx: this.currentTile.tx + dx,
        ty: this.currentTile.ty + dy,
      };

      if (this.collision.isWalkablePos(nextTile)) {
        this.startMove(nextTile, dx, dy);
      }
    } else {
      const dirKey = `${this.facingDx},${this.facingDy}`;
      this.anim.play(DIR_TO_IDLE[dirKey] ?? 'idle-s');
    }
  }

  private startMove(target: TilePos, dx: number, dy: number): void {
    this.state = 'MOVING';
    const duration = this.isRunning ? MOVE_DURATION_RUN : MOVE_DURATION_NORMAL;

    const startX = this.renderX;
    const startY = this.renderY;
    const endX = tileToWorld(target.tx);
    const endY = tileToWorld(target.ty);

    // Tween renderX
    const obj = { x: startX, y: startY };

    let tweensDone = 0;
    const onDone = () => {
      tweensDone++;
      if (tweensDone < 2) return;
      this.renderX = endX;
      this.renderY = endY;
      this.worldX = endX;
      this.worldY = endY;
      this.currentTile = { ...target };
      this.state = 'IDLE';
      this.touchCooldown = 0.05;

      EventBus.emit('player-moved', { tilePos: { ...target }, worldX: endX, worldY: endY });
    };

    // Animate x and y separately so they can work independently
    this.tweens.tween({
      target: obj, prop: 'x', from: startX, to: endX,
      duration, easing: Easing.linear,
      onUpdate: v => { this.renderX = v; },
      onComplete: onDone,
    });
    this.tweens.tween({
      target: obj, prop: 'y', from: startY, to: endY,
      duration, easing: Easing.linear,
      onUpdate: v => { this.renderY = v; },
      onComplete: onDone,
    });

    void dx; void dy; // used for facing, already set before call
  }

  setRunEnabled(val: boolean): void { this.runEnabled = val; }

  setInteracting(val: boolean): void {
    this.state = val ? 'INTERACTING' : 'IDLE';
  }

  render(ctx: CanvasRenderingContext2D, cam: CameraController): void {
    const dirKey = `${this.facingDx},${this.facingDy}`;
    const isIdle = this.state === 'IDLE' || this.state === 'INTERACTING';

    const WALK_KEY: Record<string, string> = {
      '0,1':  'dancy-walk-s', '-1,1': 'dancy-walk-s', '1,1':  'dancy-walk-s',
      '0,-1': 'dancy-walk-n', '-1,-1':'dancy-walk-n', '1,-1': 'dancy-walk-n',
      '1,0':  'dancy-walk-e',
      '-1,0': 'dancy-walk-w',
    };
    const IDLE_KEY: Record<string, string> = {
      '0,1':  'dancy-idle-s', '-1,1': 'dancy-idle-w', '1,1':  'dancy-idle-e',
      '0,-1': 'dancy-idle-n', '-1,-1':'dancy-idle-w', '1,-1': 'dancy-idle-e',
      '1,0':  'dancy-idle-e',
      '-1,0': 'dancy-idle-w',
    };

    const key = isIdle ? (IDLE_KEY[dirKey] ?? 'dancy-walk-s') : (WALK_KEY[dirKey] ?? 'dancy-walk-s');
    const img = this.sprites.get(key);

    const DEST_W = 22, DEST_H = 36;
    const cx = Math.round(this.renderX - cam.x);
    const cy = Math.round(this.renderY - cam.y);

    if (!img) {
      ctx.fillStyle = '#e75480';
      ctx.fillRect(cx - 10, cy - 18, 20, 28);
      return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(cx, cy);
    ctx.drawImage(img, -DEST_W / 2, -DEST_H + 6, DEST_W, DEST_H);
    ctx.imageSmoothingEnabled = false;
    ctx.restore();
  }

  /** worldY used for depth-sorting */
  get sortY(): number { return this.renderY; }
}

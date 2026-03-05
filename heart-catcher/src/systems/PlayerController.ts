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

  readonly anim = new AnimationController();
  private spritesheet: HTMLImageElement | null = null;

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
    // LPC spritesheet: 64×64 frames, walk rows 8-11
    // Row 8=N, 9=W, 10=S, 11=E (9 frames each, columns 0-8)
    // Use all 8 walking frames (1-8) to capture full arm swing animation
    const WALK_FPS = 9;
    const dirs = ['s','se','e','ne','n','nw','w','sw'];
    dirs.forEach(dir => {
      this.anim.define(`walk-${dir}`, { frames: [1, 2, 3, 4, 5, 6, 7, 8], fps: WALK_FPS, loop: true });
      this.anim.define(`idle-${dir}`, { frames: [0], fps: 4, loop: true });
    });
    this.anim.play('idle-s');
  }

  loadSprite(assets: AssetLoader): void {
    this.spritesheet = assets.getImage('player-walk');
  }

  get tilePos(): TilePos { return { ...this.currentTile }; }
  get facingTile(): TilePos {
    return { tx: this.currentTile.tx + this.facingDx, ty: this.currentTile.ty + this.facingDy };
  }
  get isBusy(): boolean { return this.state !== 'IDLE'; }

  update(dt: number): void {
    this.anim.update(dt);
    this.input.pollGamepad();
    this.isRunning = this.input.isRunDown();

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

  setInteracting(val: boolean): void {
    this.state = val ? 'INTERACTING' : 'IDLE';
  }

  render(ctx: CanvasRenderingContext2D, cam: CameraController): void {
    const sheet = this.spritesheet ?? this.assets.getImage('player-walk');
    if (!sheet) {
      const sx = Math.round(this.renderX - cam.x) - 10;
      const sy = Math.round(this.renderY - cam.y) - 18;
      ctx.fillStyle = '#e75480';
      ctx.fillRect(sx, sy, 20, 28);
      return;
    }

    // LPC format: 64×64 px frames, walk rows 8-11
    // Row 8=N, 9=W, 10=S, 11=E
    const LPC_ROW: Record<string, number> = {
      '0,-1': 8,  // N
      '-1,-1': 8, // NW → N
      '1,-1': 11, // NE → E
      '-1,0': 9,  // W
      '1,0': 11,  // E
      '0,1': 10,  // S
      '-1,1': 9,  // SW → W
      '1,1': 11,  // SE → E
    };

    const FRAME_SRC = 64;
    const DEST_W = 22, DEST_H = 32; // enlarged from 16×24

    const dirKey = `${this.facingDx},${this.facingDy}`;
    const lpcRow = LPC_ROW[dirKey] ?? 10;
    const col = this.anim.frame; // already 0-8 from frames definition

    const srcX = col * FRAME_SRC;
    const srcY = lpcRow * FRAME_SRC;

    const sx = Math.round(this.renderX - cam.x) - DEST_W / 2;
    const sy = Math.round(this.renderY - cam.y) - DEST_H + 5; // feet at renderY

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sheet, srcX, srcY, FRAME_SRC, FRAME_SRC, sx, sy, DEST_W, DEST_H);
    ctx.imageSmoothingEnabled = false;
  }

  /** worldY used for depth-sorting */
  get sortY(): number { return this.renderY; }
}

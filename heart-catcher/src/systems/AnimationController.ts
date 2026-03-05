/**
 * AnimationController — spritesheet frame-based animation state machine.
 * Each animation is a named list of frame indices with an fps rate.
 */

export interface AnimDef {
  frames: number[];
  fps: number;
  loop: boolean;
}

export class AnimationController {
  private anims = new Map<string, AnimDef>();
  private current: AnimDef | null = null;
  private currentName = '';
  private elapsed = 0;
  private frameIndex = 0;
  private done = false;
  onComplete: (() => void) | null = null;

  define(name: string, def: AnimDef): void {
    this.anims.set(name, def);
  }

  play(name: string, forceRestart = false): void {
    if (this.currentName === name && !forceRestart) return;
    const def = this.anims.get(name);
    if (!def) return;
    this.current = def;
    this.currentName = name;
    this.elapsed = 0;
    this.frameIndex = 0;
    this.done = false;
  }

  update(dt: number): void {
    if (!this.current || this.done) return;
    this.elapsed += dt;
    const frameDuration = 1 / this.current.fps;
    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      this.frameIndex++;
      if (this.frameIndex >= this.current.frames.length) {
        if (this.current.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = this.current.frames.length - 1;
          this.done = true;
          this.onComplete?.();
          break;
        }
      }
    }
  }

  /** Current spritesheet frame index */
  get frame(): number {
    return this.current?.frames[this.frameIndex] ?? 0;
  }

  get name(): string {
    return this.currentName;
  }

  isPlaying(name: string): boolean {
    return this.currentName === name && !this.done;
  }

  isDone(): boolean {
    return this.done;
  }
}

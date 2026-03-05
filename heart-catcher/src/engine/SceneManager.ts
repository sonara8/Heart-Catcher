import type { CanvasRenderingContext2D } from '../types/canvas';

export interface Scene {
  /** Called when scene becomes active. data is optional init payload. */
  init(data?: unknown): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  /** Called when scene is removed from stack */
  destroy(): void;
}

/**
 * SceneManager — stack-based scene system.
 * push()  → overlay (Scrapbook over Game)
 * pop()   → return to previous
 * switch() → full scene replacement
 * overlay slot → UIOverlayScene runs permanently outside the stack
 */
export class SceneManager {
  private stack: Scene[] = [];
  private overlay: Scene | null = null;
  private pendingOp: (() => void) | null = null;

  setOverlay(scene: Scene, data?: unknown): void {
    this.overlay = scene;
    this.overlay.init(data);
  }

  switch(scene: Scene, data?: unknown): void {
    this.pendingOp = () => {
      this.stack.forEach(s => s.destroy());
      this.stack = [scene];
      scene.init(data);
    };
  }

  push(scene: Scene, data?: unknown): void {
    this.pendingOp = () => {
      this.stack.push(scene);
      scene.init(data);
    };
  }

  pop(): void {
    this.pendingOp = () => {
      const top = this.stack.pop();
      top?.destroy();
    };
  }

  update(dt: number): void {
    // Apply any pending scene operations between frames
    if (this.pendingOp) {
      this.pendingOp();
      this.pendingOp = null;
    }

    // Only top scene on stack updates (unless it's transparent)
    const top = this.stack[this.stack.length - 1];
    top?.update(dt);

    // Overlay always updates
    this.overlay?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Render all scenes in stack (bottom to top) — allows transparent overlays
    for (const scene of this.stack) {
      scene.render(ctx);
    }
    // Overlay always renders on top
    this.overlay?.render(ctx);
  }

  current(): Scene | null {
    return this.stack[this.stack.length - 1] ?? null;
  }
}

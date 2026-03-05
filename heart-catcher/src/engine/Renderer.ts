/**
 * Renderer — manages the Canvas 2D context.
 * Logical resolution is 320×240. Physical canvas is scaled by devicePixelRatio
 * (capped at 2×) so text and sprites are rendered with more physical pixels,
 * giving crisper results on retina / HiDPI screens.
 * All game code uses 320×240 logical coordinates — the transform is invisible.
 */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  readonly width = 320;
  readonly height = 240;
  readonly dpr: number;

  constructor(canvasId: string) {
    const el = document.getElementById(canvasId);
    if (!(el instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element #${canvasId} not found`);
    }
    this.canvas = el;

    // Scale physical canvas by dpr so 1 logical px = dpr physical px
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    this.beginFrame();
  }

  /** Reset transform and rendering settings — call once at the top of each frame. */
  beginFrame(): void {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  clear(color = '#1a1a2e'): void {
    this.beginFrame();
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}

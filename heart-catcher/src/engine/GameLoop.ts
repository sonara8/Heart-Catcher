/**
 * GameLoop — fixed-timestep accumulator
 * Game logic always runs at 60 ticks/sec regardless of display refresh rate.
 * Render receives an interpolation alpha for smooth in-between frames.
 */
export class GameLoop {
  private readonly FIXED_STEP = 1000 / 60; // ~16.667ms
  private readonly MAX_FRAME_SKIP = 5;

  private lastTime = 0;
  private accumulator = 0;
  private rafId = 0;
  private running = false;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: (alpha: number) => void,
  ) {}

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (timestamp: number): void => {
    if (!this.running) return;

    const elapsed = Math.min(
      timestamp - this.lastTime,
      this.FIXED_STEP * this.MAX_FRAME_SKIP,
    );
    this.lastTime = timestamp;
    this.accumulator += elapsed;

    while (this.accumulator >= this.FIXED_STEP) {
      this.update(this.FIXED_STEP / 1000); // dt in seconds
      this.accumulator -= this.FIXED_STEP;
    }

    const alpha = this.accumulator / this.FIXED_STEP;
    this.render(alpha);

    this.rafId = requestAnimationFrame(this.tick);
  };
}

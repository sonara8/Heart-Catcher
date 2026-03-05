/**
 * TweenEngine — lightweight timeline-based interpolation.
 * Drives all animation "game juice": heart pops, compass pulse, grass squash-stretch.
 */

export type EasingFn = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInQuad: (t: number) => t * t,
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutBounce: (t: number) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

interface TweenDef {
  id: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: Record<string, any>;
  prop: string;
  from: number;
  to: number;
  duration: number;
  elapsed: number;
  easing: EasingFn;
  onComplete?: () => void;
  onUpdate?: (value: number) => void;
  delay: number;
  yoyo: boolean;
  loops: number;
  currentLoop: number;
}

export class TweenEngine {
  private tweens: TweenDef[] = [];
  private nextId = 1;

  tween(options: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: Record<string, any>;
    prop: string;
    from?: number;
    to: number;
    duration: number;
    easing?: EasingFn;
    onComplete?: () => void;
    onUpdate?: (value: number) => void;
    delay?: number;
    yoyo?: boolean;
    loops?: number;
  }): number {
    const from = options.from ?? options.target[options.prop];
    const id = this.nextId++;
    this.tweens.push({
      id,
      target: options.target,
      prop: options.prop,
      from,
      to: options.to,
      duration: options.duration,
      elapsed: 0,
      easing: options.easing ?? Easing.linear,
      onComplete: options.onComplete,
      onUpdate: options.onUpdate,
      delay: options.delay ?? 0,
      yoyo: options.yoyo ?? false,
      loops: options.loops ?? 1,
      currentLoop: 0,
    });
    return id;
  }

  kill(id: number): void {
    this.tweens = this.tweens.filter(t => t.id !== id);
  }

  killAll(): void {
    this.tweens = [];
  }

  update(dt: number): void {
    const finished: number[] = [];

    for (const t of this.tweens) {
      t.elapsed += dt;

      if (t.elapsed < t.delay) continue;

      const localTime = t.elapsed - t.delay;
      const progress = Math.min(localTime / t.duration, 1);
      const easedValue = t.easing(progress);
      const value = t.from + (t.to - t.from) * easedValue;

      t.target[t.prop] = value;
      t.onUpdate?.(value);

      if (progress >= 1) {
        t.currentLoop++;
        if (t.yoyo) {
          [t.from, t.to] = [t.to, t.from];
        }
        if (t.currentLoop >= t.loops) {
          t.onComplete?.();
          finished.push(t.id);
        } else {
          t.elapsed = t.delay; // restart loop
        }
      }
    }

    this.tweens = this.tweens.filter(t => !finished.includes(t.id));
  }

  /** Chain helper — runs a sequence of tweens one after another */
  sequence(steps: Parameters<TweenEngine['tween']>[0][]): void {
    let totalDelay = 0;
    for (const step of steps) {
      this.tween({ ...step, delay: (step.delay ?? 0) + totalDelay });
      totalDelay += step.duration + (step.delay ?? 0);
    }
  }
}

import { EventBus } from '../engine/EventBus';

const HINT_TIMEOUT = 45; // seconds

/**
 * HintSystem — "Soso Call"
 * Fires a hint dialogue after HINT_TIMEOUT seconds of no player progress.
 * Timer resets on every player move and every heart found.
 */
export class HintSystem {
  private timer = HINT_TIMEOUT;
  private hints: string[] = [];
  private active = false;
  private hintIndex = 0;

  init(hintText: string[]): void {
    this.hints = hintText;
    this.timer = HINT_TIMEOUT;
    this.active = false;
    this.hintIndex = 0;

    EventBus.on('player-moved', this.resetTimer);
    EventBus.on('heart-found', this.resetTimer);
  }

  destroy(): void {
    EventBus.off('player-moved', this.resetTimer);
    EventBus.off('heart-found', this.resetTimer);
  }

  private resetTimer = (): void => {
    this.timer = HINT_TIMEOUT;
    this.active = false;
  };

  dismiss(): void {
    this.active = false;
    this.timer = HINT_TIMEOUT;
  }

  update(dt: number): void {
    if (this.active || this.hints.length === 0) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = HINT_TIMEOUT;
      this.active = true;
      const hint = this.hints[this.hintIndex % this.hints.length];
      this.hintIndex++;
      EventBus.emit('show-hint', { text: hint });
    }
  }

  get isActive(): boolean { return this.active; }
}

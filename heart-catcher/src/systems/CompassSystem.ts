import type { AudioEngine } from '../engine/AudioEngine';
import { distance } from './CollisionMap';

/**
 * CompassSystem — proximity sensor.
 * Computes nearest heart distance → drives pulse interval and color.
 */
export class CompassSystem {
  private pulseTimer = 0;
  private pulseInterval = 2.0; // seconds
  private pulseScale = 1.0;
  private isShrinking = false;

  // Exposed to Compass UI widget
  scale = 1.0;
  color = '#ff8800';
  isNearby = false; // true when very close

  private sfxTimer = 0;

  constructor(private readonly audio: AudioEngine) {}

  update(
    dt: number,
    playerX: number,
    playerY: number,
    heartPositions: { x: number; y: number }[],
  ): void {
    if (heartPositions.length === 0) {
      this.pulseInterval = 3;
      this.color = '#555555';
      this.isNearby = false;
      return;
    }

    const nearest = Math.min(
      ...heartPositions.map(h => distance(playerX, playerY, h.x, h.y)),
    );

    // Normalize: 0 = far (200px+), 1 = very close
    const normalized = 1 - Math.min(nearest / 200, 1);
    this.pulseInterval = 2.0 - normalized * 1.85; // 2.0s → 0.15s
    this.color = normalized > 0.65 ? '#ff2244' : '#ff8800';
    this.isNearby = normalized > 0.8;

    // Drive pulse animation
    this.pulseTimer += dt;
    if (this.pulseTimer >= this.pulseInterval) {
      this.pulseTimer = 0;
      this.isShrinking = false;
      this.pulseScale = 1.3;

      // SFX tick when close
      this.sfxTimer += this.pulseInterval;
      if (normalized > 0.3) {
        this.audio.playSFX('compass-tick', 0.2 + normalized * 0.5);
      }
    }

    // Animate scale back down
    if (this.pulseScale > 1.0) {
      this.pulseScale -= dt * 4;
      if (this.pulseScale < 1.0) this.pulseScale = 1.0;
    }
    this.scale = this.pulseScale;
  }
}

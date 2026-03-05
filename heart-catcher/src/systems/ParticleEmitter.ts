/**
 * ParticleEmitter — pool-based particle system.
 * Pre-allocates 100 particles, recycles them to avoid GC pressure.
 */

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity: number;
}

const POOL_SIZE = 100;

export class ParticleEmitter {
  private pool: Particle[] = [];

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1, color: '#fff', size: 2, gravity: 0,
      });
    }
  }

  private acquire(): Particle | null {
    return this.pool.find(p => !p.active) ?? null;
  }

  /** Sparkle burst when a heart is found */
  sparkle(worldX: number, worldY: number, count = 12): void {
    const colors = ['#ff6b9d', '#ffd700', '#ffffff', '#ff9ef5'];
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 30 + Math.random() * 40;
      p.active = true;
      p.x = worldX;
      p.y = worldY;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.5 + Math.random() * 0.3;
      p.maxLife = p.life;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.size = 1 + Math.floor(Math.random() * 2);
      p.gravity = 60;
    }
  }

  /** Confetti burst for the finale */
  confetti(worldX: number, worldY: number, count = 20): void {
    const colors = ['#ff6b9d', '#ffd700', '#7ec8e3', '#f9a826', '#a8e6cf'];
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 60 + Math.random() * 80;
      p.active = true;
      p.x = worldX + (Math.random() - 0.5) * 80;
      p.y = worldY;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 1 + Math.random() * 0.5;
      p.maxLife = p.life;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.size = 2;
      p.gravity = 80;
    }
  }

  /** Small dust puff for running */
  dust(worldX: number, worldY: number): void {
    const p = this.acquire();
    if (!p) return;
    p.active = true;
    p.x = worldX + (Math.random() - 0.5) * 4;
    p.y = worldY + 4;
    p.vx = (Math.random() - 0.5) * 15;
    p.vy = -10 - Math.random() * 10;
    p.life = 0.25;
    p.maxLife = 0.25;
    p.color = '#c8a96e';
    p.size = 1;
    p.gravity = 0;
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const sx = Math.round(p.x - camX);
      const sy = Math.round(p.y - camY);
      ctx.fillRect(sx, sy, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

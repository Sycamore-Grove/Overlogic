// ParticleSystem.js — lightweight particle pool for hit sparks, dashes, explosions.

export class Particle {
  constructor(x, y, vx, vy, life, color, size) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color; this.size = size;
    this.dead = false;
  }
  tick(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(g, scale) {
    const a = Math.max(0, this.life / this.maxLife);
    g.globalAlpha = a;
    g.fillStyle = this.color;
    const s = this.size * a;
    g.fillRect(this.x * scale - s/2, this.y * scale - s/2, s, s);
    g.globalAlpha = 1;
  }
}

export function spawnBurst(ctx, x, y, color, count = 8, speed = 4, life = 0.3, size = 4) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const sp = speed * (0.5 + Math.random() * 0.5);
    ctx.particles.push(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, life, color, size));
  }
}

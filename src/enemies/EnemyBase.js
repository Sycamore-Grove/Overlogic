// EnemyBase.js — base enemy. Subclasses override tickBehavior(dt).
// Mirrors scripts/enemies/EnemyBase.gd. Pure class with tick + draw.

import { AudioManager } from '../systems/AudioManager.js';
import { spawnBurst } from '../vfx/ParticleSystem.js';

export class EnemyBase {
  constructor() {
    this.enemyId = '';
    this.maxHp = 20; this.hp = 20;
    this.moveSpeed = 2.5; this.damage = 8;
    this.attackRange = 1; this.attackCooldown = 1.2;
    this.bodyRadius = 0.35;
    this.data = null;
    this.dead = false;
    this.attackTimer = 0;
    this.ctx = null;
    this.state = 'chasing';
    this.x = 0; this.y = 0;
    this.color = [1, 0.35, 0.25];
  }

  init(data, ctx) {
    this.data = data; this.ctx = ctx;
    this.enemyId = data.id;
    this.maxHp = data.maxHp; this.hp = this.maxHp;
    this.moveSpeed = data.moveSpeed;
    this.damage = data.damage;
    this.attackRange = data.attackRange;
    this.attackCooldown = data.attackCooldown;
    this.bodyRadius = data.bodyRadius ?? 0.35;
    this.color = data.color || [1, 0.3, 0.3];
  }

  isDead() { return this.dead; }
  isCasting() { return false; }
  interrupt() { /* base no-op */ }

  takeDamage(amount, kind) {
    if (this.dead) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true;
      this.ctx.tracker.recordEnemyDeath(this.enemyId);
      // Overlogic: low-HP kill bonus
      const r = this.ctx.robot;
      if (r && !r.dead) {
        const hpPct = r.hp / r.maxHp;
        if (hpPct < 0.20) {
          this.ctx.overlogic.addEvent('low_hp_kill', 12);
          this.ctx.tracker.recordLowHpKill();
        }
      }
      spawnBurst(this.ctx, this.x, this.y, `rgba(${this.color[0]*255|0},${this.color[1]*255|0},${this.color[2]*255|0},0.9)`, 12, 5, 0.4, 4);
      AudioManager.play('enemy_death');
    }
  }

  // dt is combat-speed-scaled.
  tick(dt) {
    if (this.dead || !this.ctx || !this.ctx.robot || this.ctx.robot.dead) return;
    this.attackTimer -= dt;
    this.tickBehavior(dt);
  }

  // Override in subclass.
  tickBehavior(dt) {
    const r = this.ctx.robot;
    const dx = r.x - this.x, dy = r.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist, dirY = dy / dist;
    if (dist > this.attackRange) {
      this.state = 'chasing';
      const next = this.ctx.clampToArena({ x: this.x + dirX * this.moveSpeed * dt, y: this.y + dirY * this.moveSpeed * dt });
      this.x = next.x; this.y = next.y;
    } else {
      this.state = 'attacking';
      if (this.attackTimer <= 0) {
        this.ctx.robot.takeDamage(this.damage, this.enemyId);
        this.attackTimer = this.attackCooldown;
      }
    }
  }

  draw(g, scale) {
    const sz = this.bodyRadius * 2 * scale;
    const [cr, cg, cb] = this.color;
    g.fillStyle = this.dead ? '#444' : `rgb(${cr*255|0},${cg*255|0},${cb*255|0})`;
    g.fillRect(this.x * scale - sz/2, this.y * scale - sz/2, sz, sz);
    // hp bar
    if (!this.dead && this.hp < this.maxHp) {
      const bw = sz, bh = 3;
      g.fillStyle = '#400';
      g.fillRect(this.x * scale - bw/2, this.y * scale - sz/2 - 6, bw, bh);
      g.fillStyle = '#f55';
      g.fillRect(this.x * scale - bw/2, this.y * scale - sz/2 - 6, bw * (this.hp/this.maxHp), bh);
    }
  }
}

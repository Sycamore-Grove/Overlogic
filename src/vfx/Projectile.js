// Projectile.js — bullet. Player bullets damage enemies; enemy bullets damage robot.
// Mirrors scripts/vfx/Projectile.gd. Pure class with tick + draw.

import { AudioManager } from '../systems/AudioManager.js';

export class Projectile {
  constructor() {
    this.x = 0; this.y = 0;
    this.dir = { x: 0, y: 0 };
    this.speed = 12; this.life = 2; this.dmg = 8;
    this.kind = 'basic';      // basic / interrupt / enemy
    this.fromPlayer = true;
    this.specificTarget = null;
    this.ctx = null;
    this.dead = false;
  }

  setup(start, dir, speed, life, dmg, kind, fromPlayer, specificTarget = null) {
    this.x = start.x; this.y = start.y;
    const len = Math.hypot(dir.x, dir.y) || 1;
    this.dir = { x: dir.x / len, y: dir.y / len };
    this.speed = speed; this.life = life; this.dmg = dmg;
    this.kind = kind; this.fromPlayer = fromPlayer;
    this.specificTarget = specificTarget;
  }

  setCtx(ctx) { this.ctx = ctx; }

  // dt is combat-speed-scaled.
  tick(dt) {
    if (!this.ctx || this.dead) return;
    // Mild homing for interrupt toward specific target
    if (this.specificTarget && !this.specificTarget.dead) {
      const dx = this.specificTarget.x - this.x, dy = this.specificTarget.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      this.dir = { x: dx / len, y: dy / len };
    }
    this.x += this.dir.x * this.speed * dt;
    this.y += this.dir.y * this.speed * dt;
    this.life -= dt;
    if (this.life <= 0) { this._destroy(); return; }
    if (this.fromPlayer) {
      for (const e of this.ctx.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) <= e.bodyRadius + 0.15) {
          const wasCasting = e.isCasting();
          e.takeDamage(this.dmg, this.kind);
          if (this.kind === 'interrupt') {
            e.interrupt();
            if (wasCasting) {
              this.ctx.tracker.recordInterruptSuccess();
              AudioManager.play('interrupt_success');
            }
          }
          this._destroy();
          return;
        }
      }
    } else {
      const r = this.ctx.robot;
      if (r && !r.dead && Math.hypot(r.x - this.x, r.y - this.y) <= r.bodyRadius + 0.15) {
        r.takeDamage(this.dmg, 'projectile');
        this._destroy();
      }
    }
  }

  _destroy() {
    this.dead = true;
    const i = this.ctx.projectiles.indexOf(this);
    if (i >= 0) this.ctx.projectiles.splice(i, 1);
  }

  draw(g, scale) {
    const sz = this.fromPlayer ? 6 : 8;
    const color = this.fromPlayer
      ? (this.kind === 'basic' ? '#9ce8ff' : '#ffe24b')
      : '#ff6a4d';
    g.fillStyle = color;
    g.fillRect(this.x * scale - sz/2, this.y * scale - sz/2, sz, sz);
  }
}

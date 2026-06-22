// Mine.js — static explosive. Detonates when enemy within trigger radius.
// Mirrors scripts/vfx/Mine.gd. Pure class with tick + draw.

import { AudioManager } from '../systems/AudioManager.js';

export class Mine {
  constructor() {
    this.x = 0; this.y = 0;
    this.triggerRadius = 1.5; this.explosionRadius = 2; this.dmg = 20;
    this.ctx = null; this.armed = true;
    this.dead = false;
    this._pulse = 0;
  }

  setup(start, tr, er, dmg, ctx) {
    this.x = start.x; this.y = start.y;
    this.triggerRadius = tr; this.explosionRadius = er; this.dmg = dmg;
    this.ctx = ctx;
  }

  tick(dt) {
    if (!this.armed || this.dead) return;
    this._pulse += dt;
    for (const e of this.ctx.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) <= this.triggerRadius) {
        this._detonate();
        return;
      }
    }
  }

  _detonate() {
    this.armed = false; this.dead = true;
    for (const e of this.ctx.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) <= this.explosionRadius) {
        e.takeDamage(this.dmg, 'mine');
      }
    }
    AudioManager.play('mine_explosion');
    const i = this.ctx.mines.indexOf(this);
    if (i >= 0) this.ctx.mines.splice(i, 1);
  }

  draw(g, scale) {
    const pulse = 0.5 + 0.5 * Math.sin(this._pulse * 6);
    g.fillStyle = `rgba(80,255,140,${0.4 + pulse * 0.4})`;
    g.fillRect(this.x * scale - 4, this.y * scale - 4, 8, 8);
    // trigger radius faint ring
    g.strokeStyle = 'rgba(80,255,140,0.15)';
    g.beginPath();
    g.arc(this.x * scale, this.y * scale, this.triggerRadius * scale, 0, Math.PI * 2);
    g.stroke();
  }
}

// ChargerEnemy.js — charge caster. Telegraph → charge → impact.
// Mirrors scripts/enemies/ChargerEnemy.gd.

import { EnemyBase } from './EnemyBase.js';

export class ChargerEnemy extends EnemyBase {
  constructor() {
    super();
    this.chargeSpeed = 7;
    this.chargeTelegraph = 1.2;
    this.chargeDistance = 6;
    this.chargeState = 'idle';   // idle / casting / charging
    this.chargeTimer = 0;
    this.chargeDir = { x: 0, y: 0 };
    this.chargeRemaining = 0;
  }

  init(data, ctx) {
    super.init(data, ctx);
    this.chargeSpeed = data.chargeSpeed ?? 7;
    this.chargeTelegraph = data.chargeTelegraph ?? 1.2;
    this.chargeDistance = data.chargeDistance ?? 6;
  }

  isCasting() { return this.chargeState === 'casting'; }

  interrupt() {
    if (this.chargeState === 'casting') {
      this.chargeState = 'idle';
      this.chargeTimer = 0;
    }
  }

  tickBehavior(dt) {
    const r = this.ctx.robot;
    const dx = r.x - this.x, dy = r.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist, dirY = dy / dist;
    switch (this.chargeState) {
      case 'idle':
        if (dist <= 5 && this.attackTimer <= 0) {
          this.chargeState = 'casting';
          this.chargeTimer = this.chargeTelegraph;
        } else {
          this.state = 'chasing';
          const next = this.ctx.clampToArena({ x: this.x + dirX * this.moveSpeed * dt, y: this.y + dirY * this.moveSpeed * dt });
          this.x = next.x; this.y = next.y;
        }
        break;
      case 'casting':
        this.state = 'casting';
        this.chargeTimer -= dt;
        if (this.chargeTimer <= 0) {
          this.chargeState = 'charging';
          this.chargeDir = { x: dirX, y: dirY };
          this.chargeRemaining = this.chargeDistance;
        }
        break;
      case 'charging': {
        this.state = 'charging';
        const step = this.chargeSpeed * dt;
        const prevX = this.x, prevY = this.y;
        const nx = this.x + this.chargeDir.x * step;
        const ny = this.y + this.chargeDir.y * step;
        const clamped = this.ctx.clampToArena({ x: nx, y: ny });
        const moved = Math.hypot(clamped.x - prevX, clamped.y - prevY);
        this.x = clamped.x; this.y = clamped.y;
        this.chargeRemaining -= moved;
        if (Math.hypot(this.x - r.x, this.y - r.y) <= this.bodyRadius + r.bodyRadius) {
          r.takeDamage(this.damage, this.enemyId);
          this.chargeState = 'idle';
          this.attackTimer = this.attackCooldown;
        } else if (this.chargeRemaining <= 0 || moved < step * 0.5) {
          this.chargeState = 'idle';
          this.attackTimer = this.attackCooldown;
        }
        break;
      }
    }
  }

  draw(g, scale) {
    super.draw(g, scale);
    // telegraph ring when casting
    if (this.chargeState === 'casting') {
      const t = 1 - this.chargeTimer / this.chargeTelegraph;
      g.strokeStyle = `rgba(255,40,40,${0.4 + t * 0.5})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(this.x * scale, this.y * scale, (this.bodyRadius + 0.3 + t * 0.4) * scale, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 1;
    }
  }
}

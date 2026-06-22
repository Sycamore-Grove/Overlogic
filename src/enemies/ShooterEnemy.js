// ShooterEnemy.js — ranged kiter. Mirrors scripts/enemies/ShooterEnemy.gd.
import { EnemyBase } from './EnemyBase.js';
import { Projectile } from '../vfx/Projectile.js';

export class ShooterEnemy extends EnemyBase {
  constructor() {
    super();
    this.projectileSpeed = 8;
    this.projectileLife = 3;
    this.kiteDistance = 3;
  }

  init(data, ctx) {
    super.init(data, ctx);
    this.projectileSpeed = data.projectileSpeed ?? 8;
    this.projectileLife = data.projectileLife ?? 3;
    this.kiteDistance = data.kiteDistance ?? 3;
  }

  tickBehavior(dt) {
    const r = this.ctx.robot;
    const dx = r.x - this.x, dy = r.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist, dirY = dy / dist;
    if (dist < this.kiteDistance) {
      this.state = 'kiting';
      const next = this.ctx.clampToArena({ x: this.x - dirX * this.moveSpeed * dt, y: this.y - dirY * this.moveSpeed * dt });
      this.x = next.x; this.y = next.y;
    } else if (dist > this.attackRange) {
      this.state = 'chasing';
      const next = this.ctx.clampToArena({ x: this.x + dirX * this.moveSpeed * dt, y: this.y + dirY * this.moveSpeed * dt });
      this.x = next.x; this.y = next.y;
    } else {
      this.state = 'attacking';
      if (this.attackTimer <= 0) {
        this._fireAt({ x: r.x, y: r.y });
        this.attackTimer = this.attackCooldown;
      }
    }
  }

  _fireAt(target) {
    const p = new Projectile();
    const dx = target.x - this.x, dy = target.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    p.setup({ x: this.x, y: this.y }, { x: dx/len, y: dy/len }, this.projectileSpeed, this.projectileLife, this.damage, 'enemy', false);
    p.setCtx(this.ctx);
    this.ctx.projectiles.push(p);
  }
}

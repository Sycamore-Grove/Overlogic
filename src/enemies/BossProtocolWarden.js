// BossProtocolWarden.js — 3-phase boss. Mirrors scripts/enemies/BossProtocolWarden.gd.
import { EnemyBase } from './EnemyBase.js';
import { Projectile } from '../vfx/Projectile.js';
import { AudioManager } from '../systems/AudioManager.js';
import { spawnBurst } from '../vfx/ParticleSystem.js';
import { GameDatabase } from '../core/GameDatabase.js';
import { CrawlerEnemy } from './CrawlerEnemy.js';

export class BossProtocolWarden extends EnemyBase {
  constructor() {
    super();
    this.currentPhase = 1;
    this.phase2HpPct = 0.65;
    this.phase3HpPct = 0.30;
    this.actionTimer = 0;
    this.summonTimer = 8;
    this.laserTimer = 5;
    this.laserCastingTimer = 0;
    this.laserActive = false;
    this.laserAngle = 0;
    this.onPhaseChanged = null;
  }

  init(data, ctx) {
    super.init(data, ctx);
    this.phase2HpPct = data.phase2HpPct ?? 0.65;
    this.phase3HpPct = data.phase3HpPct ?? 0.30;
  }

  isCasting() { return this.laserActive && this.laserCastingTimer > 0; }

  interrupt() {
    if (this.laserActive && this.laserCastingTimer > 0) {
      this.laserActive = false;
      this.laserCastingTimer = 0;
      this.laserTimer = 5;
    }
  }

  takeDamage(amount, kind) {
    if (this.dead) return;
    this.hp -= amount;
    const pct = this.hp / this.maxHp;
    if (this.currentPhase === 1 && pct <= this.phase2HpPct) this._enterPhase(2);
    else if (this.currentPhase === 2 && pct <= this.phase3HpPct) this._enterPhase(3);
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true;
      this.ctx.tracker.recordEnemyDeath(this.enemyId);
      spawnBurst(this.ctx, this.x, this.y, 'rgba(255,60,120,0.9)', 24, 7, 0.6, 6);
      AudioManager.play('enemy_death');
    }
  }

  _enterPhase(p) {
    this.currentPhase = p;
    if (this.onPhaseChanged) this.onPhaseChanged(p);
    AudioManager.play('boss_phase');
  }

  tickBehavior(dt) {
    const r = this.ctx.robot;
    const dx = r.x - this.x, dy = r.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist, dirY = dy / dist;
    switch (this.currentPhase) {
      case 1: this._phase1(dt, r, dirX, dirY, dist); break;
      case 2: this._phase2(dt, r, dirX, dirY, dist); break;
      case 3: this._phase3(dt, r, dirX, dirY); break;
    }
  }

  _phase1(dt, r, dirX, dirY, dist) {
    this.actionTimer -= dt;
    if (this.actionTimer <= 0) {
      this._fireSpread({ x: r.x, y: r.y }, 3, 10, 6, 10);
      this.actionTimer = 1.8;
    }
    if (dist < 3 && this.attackTimer <= 0) {
      this.ctx.robot.takeDamage(15, this.enemyId);
      this.attackTimer = 1.5;
    }
  }

  _phase2(dt, r, dirX, dirY, dist) {
    this.actionTimer -= dt;
    if (this.actionTimer <= 0) {
      this._fireSpread({ x: r.x, y: r.y }, 3, 10, 6, 10);
      this.actionTimer = 1.3;
    }
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this._summonCrawler();
      this.summonTimer = 8;
    }
    if (dist > 4) {
      const next = this.ctx.clampToArena({ x: this.x + dirX * this.moveSpeed * dt, y: this.y + dirY * this.moveSpeed * dt });
      this.x = next.x; this.y = next.y;
    }
  }

  _phase3(dt, r, dirX, dirY) {
    if (!this.laserActive) {
      this.laserTimer -= dt;
      if (this.laserTimer <= 0) {
        this.laserActive = true;
        this.laserCastingTimer = 1.5;
        this.laserAngle = Math.atan2(r.y - this.y, r.x - this.x);
      }
    } else {
      this.laserCastingTimer -= dt;
      if (this.laserCastingTimer <= 0) {
        this._checkLaserHit({ x: r.x, y: r.y });
        this.laserActive = false;
        this.laserTimer = 5;
      }
    }
  }

  _checkLaserHit(robotPos) {
    // rotate robotPos into boss local frame
    const dx = robotPos.x - this.x, dy = robotPos.y - this.y;
    const localX = dx * Math.cos(-this.laserAngle) - dy * Math.sin(-this.laserAngle);
    const localY = dx * Math.sin(-this.laserAngle) + dy * Math.cos(-this.laserAngle);
    if (localX >= 0 && localX <= 8 && Math.abs(localY) <= 1.5) {
      this.ctx.robot.takeDamage(30, this.enemyId);
    }
  }

  _fireSpread(target, count, dmg, speed, spreadDeg) {
    const baseAng = Math.atan2(target.y - this.y, target.x - this.x);
    const spread = spreadDeg * Math.PI / 180;
    for (let i = 0; i < count; i++) {
      const offset = spread * (i - (count - 1) / 2);
      const ang = baseAng + offset;
      const p = new Projectile();
      p.setup({ x: this.x, y: this.y }, { x: Math.cos(ang), y: Math.sin(ang) }, speed, 3, dmg, 'enemy', false);
      p.setCtx(this.ctx);
      this.ctx.projectiles.push(p);
    }
  }

  _summonCrawler() {
    let live = 0;
    for (const e of this.ctx.enemies) if (!e.dead && e.enemyId === 'crawler') live += 1;
    if (live >= 4) return;
    for (let i = 0; i < 2; i++) {
      if (live >= 4) break;
      const crawlerData = GameDatabase.getEnemy('crawler');
      const crawler = new CrawlerEnemy();
      crawler.init(crawlerData, this.ctx);
      const ang = Math.random() * Math.PI * 2;
      const pos = this.ctx.clampToArena({ x: this.x + Math.cos(ang) * 1.5, y: this.y + Math.sin(ang) * 1.5 });
      crawler.x = pos.x; crawler.y = pos.y;
      this.ctx.enemies.push(crawler);
      live += 1;
    }
  }

  draw(g, scale) {
    super.draw(g, scale);
    // laser telegraph
    if (this.laserActive && this.laserCastingTimer > 0) {
      const t = 1 - this.laserCastingTimer / 1.5;
      g.save();
      g.translate(this.x * scale, this.y * scale);
      g.rotate(this.laserAngle);
      g.fillStyle = `rgba(255,40,40,${0.25 + t * 0.35})`;
      g.fillRect(0, -1.5 * scale, 8 * scale, 3 * scale);
      g.strokeStyle = `rgba(255,80,80,${0.5 + t * 0.5})`;
      g.strokeRect(0, -1.5 * scale, 8 * scale, 3 * scale);
      g.restore();
    }
  }
}

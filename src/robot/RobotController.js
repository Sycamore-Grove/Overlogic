// RobotController.js — player robot. Driven by ActionExecutor (moveIntent/doDash/fireBullet).
// Pure logic + render hook. No DOM. Mirrors scripts/robot/RobotController.gd.

import { Projectile } from '../vfx/Projectile.js';
import { Mine } from '../vfx/Mine.js';
import { AudioManager } from '../systems/AudioManager.js';

export class RobotController {
  constructor() {
    this.maxHp = 100; this.hp = 100;
    this.maxEnergy = 100; this.energy = 100;
    this.moveSpeed = 4; this.bodyRadius = 0.4;
    this.x = 0; this.y = 0;
    // movement
    this.moveIntent = { x: 0, y: 0 };
    this.dashVel = { x: 0, y: 0 };
    this.dashTimer = 0;
    this.invulnTimer = 0;
    // statuses
    this.shieldTimer = 0; this.shieldReduce = 0;
    this.overdriveTimer = 0; this.overdriveAtkMul = 1; this.overdriveMoveMul = 1;
    this.dead = false;
    this.stats = null; this.ctx = null;
    // callbacks for HUD
    this.onHp = null; this.onEnergy = null; this.onShield = null; this.onOverdrive = null; this.onDied = null;
  }

  initFromStats(stats, ctx) {
    this.stats = stats; this.ctx = ctx;
    this.maxHp = stats.stat('max_hp', 100);    this.hp = this.maxHp;
    this.maxEnergy = stats.stat('max_energy', 100); this.energy = this.maxEnergy;
    this.moveSpeed = stats.stat('move_speed', 4);
    this.x = 0; this.y = 0;
    this._emitHp(); this._emitEnergy();
  }

  overdriveAtkSpeedMul() { return this.overdriveTimer > 0 ? this.overdriveAtkMul : 1; }

  // dt is already combat-speed-scaled.
  tick(dt) {
    if (this.dead) return;
    // Energy regen (paused during overdrive)
    if (this.overdriveTimer <= 0) {
      this.energy = Math.min(this.maxEnergy, this.energy + this.stats.stat('energy_regen', 8) * dt);
    }
    // Energy overflow tracking
    if (this.energy >= this.maxEnergy - 0.01) this.ctx.tracker.recordEnergyOverflow(dt);
    // Cooldowns
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    let vx, vy;
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      vx = this.dashVel.x; vy = this.dashVel.y;
    } else {
      const spd = this.moveSpeed * (this.overdriveTimer > 0 ? this.overdriveMoveMul : 1);
      const len = Math.hypot(this.moveIntent.x, this.moveIntent.y);
      if (len > spd) { vx = this.moveIntent.x / len * spd; vy = this.moveIntent.y / len * spd; }
      else { vx = this.moveIntent.x; vy = this.moveIntent.y; }
    }
    // Tick down statuses
    if (this.shieldTimer > 0) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0 && this.onShield) this.onShield(false);
    }
    if (this.overdriveTimer > 0) {
      this.overdriveTimer -= dt;
      if (this.overdriveTimer <= 0) {
        this.overdriveAtkMul = 1; this.overdriveMoveMul = 1;
        if (this.onOverdrive) this.onOverdrive(false);
      }
    }
    // Move with clamping
    const next = this.ctx.clampToArena({ x: this.x + vx * dt, y: this.y + vy * dt });
    this.x = next.x; this.y = next.y;
    // NOTE: moveIntent is NOT cleared — persists between ticks for smooth motion.
    this._emitEnergy();
  }

  // ---- Action hooks (called by ActionExecutor) ----
  doDash(dir, dist, invuln) {
    const len = Math.hypot(dir.x, dir.y);
    const safe = len === 0 ? { x: 1, y: 0 } : { x: dir.x / len, y: dir.y / len };
    this.dashVel = { x: safe.x * (dist / 0.15), y: safe.y * (dist / 0.15) };
    this.dashTimer = 0.15;
    this.invulnTimer = invuln;
  }

  activateShield(dur, reduce) {
    this.shieldTimer = dur; this.shieldReduce = reduce;
    if (this.onShield) this.onShield(true);
    if (this.ctx && this.ctx.tracker) this.ctx.tracker.recordShieldActivated(this.hp / this.maxHp);
  }

  activateOverdrive(dur, atkMul, moveMul) {
    this.overdriveTimer = dur;
    this.overdriveAtkMul = atkMul; this.overdriveMoveMul = moveMul;
    if (this.onOverdrive) this.onOverdrive(true);
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this._emitHp();
  }

  fireBullet(targetPos, dmg, speed, life, kind, specificTarget = null) {
    let dx = targetPos.x - this.x, dy = targetPos.y - this.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
    const p = new Projectile();
    p.setup({ x: this.x, y: this.y }, { x: dx, y: dy }, speed, life, dmg, kind, true, specificTarget);
    p.setCtx(this.ctx);
    this.ctx.projectiles.push(p);
  }

  spawnMine(triggerR, explosionR, dmg) {
    const m = new Mine();
    m.setup({ x: this.x, y: this.y }, triggerR, explosionR, dmg, this.ctx);
    this.ctx.mines.push(m);
  }

  takeDamage(amount, sourceKind) {
    if (this.dead || this.invulnTimer > 0) return;
    let actual = amount;
    if (this.shieldTimer > 0) actual = amount * (1 - this.shieldReduce);
    this.hp -= actual;
    if (this.ctx && this.ctx.tracker) this.ctx.tracker.recordDamageTaken(actual, sourceKind);
    if (this.hp <= 0 && !this.dead) {
      this.hp = 0; this.dead = true;
      // death snapshot is taken by CombatArena._finish(false) to avoid duplication
      if (this.onDied) this.onDied();
    }
    this._emitHp();
  }

  _emitHp()     { if (this.onHp) this.onHp(this.hp, this.maxHp); }
  _emitEnergy() { if (this.onEnergy) this.onEnergy(this.energy, this.maxEnergy); }
}

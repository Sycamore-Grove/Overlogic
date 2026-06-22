// ActionExecutor.js — executes actions on the robot. Tracks per-action cooldowns.
// Mirrors scripts/logic/ActionExecutor.gd. Lives inside CombatArena tick loop.

import { GameDatabase } from '../core/GameDatabase.js';
import { Projectile } from '../vfx/Projectile.js';
import { Mine } from '../vfx/Mine.js';
import { AudioManager } from '../systems/AudioManager.js';

export class ActionExecutor {
  constructor() {
    this.robot = null;
    this.ctx = null;
    this.stats = null;        // RobotStats
    this.tracker = null;
    this.cooldowns = new Map(); // actionId -> remaining seconds
  }

  setup(robot, ctx, stats, tracker) {
    this.robot = robot;
    this.ctx = ctx;
    this.stats = stats;
    this.tracker = tracker;
    this.cooldowns.clear();
  }

  // Advance cooldown timers. dt is already combat-speed-scaled.
  tick(dt) {
    for (const [k, v] of this.cooldowns) {
      const nv = v - dt;
      if (nv <= 0) this.cooldowns.delete(k);
      else this.cooldowns.set(k, nv);
    }
  }

  isOnCooldown(actionId) {
    const v = this.cooldowns.get(actionId);
    return typeof v === 'number' && v > 0;
  }

  energyCost(actionId) { return this.stats.actionEnergyCost(actionId); }

  _startCd(actionId) { this.cooldowns.set(actionId, this.stats.actionCooldown(actionId, this.robot)); }

  // Returns true if action actually executed.
  execute(actionId) {
    if (this.isOnCooldown(actionId)) return false;
    const cost = this.energyCost(actionId);
    if (this.robot.energy < cost) return false;
    switch (actionId) {
      case 'basic_attack':   return this._basicAttack();
      case 'dash_toward':    return this._dash(true);
      case 'dash_away':      return this._dash(false);
      case 'shield':         return this._shield();
      case 'interrupt_shot': return this._interruptShot();
      case 'overdrive':      return this._overdrive();
      case 'repair':         return this._repair();
      case 'drop_mine':      this._dropMine(); return true;
      default: return false;
    }
  }

  executeDefault() {
    const e = this.ctx.nearestEnemyTo({ x: this.robot.x, y: this.robot.y });
    if (!e) return;
    const dx = e.x - this.robot.x, dy = e.y - this.robot.y;
    const len = Math.hypot(dx, dy) || 1;
    this.robot.moveIntent = {
      x: (dx / len) * this.robot.moveSpeed * 0.6,
      y: (dy / len) * this.robot.moveSpeed * 0.6,
    };
  }

  _basicAttack() {
    const e = this.ctx.nearestEnemyTo({ x: this.robot.x, y: this.robot.y });
    if (!e) return false;
    const dist = Math.hypot(e.x - this.robot.x, e.y - this.robot.y);
    const range = this.stats.actionRange('basic_attack');
    if (dist > range) {
      // move toward, do not consume CD/energy
      const dx = e.x - this.robot.x, dy = e.y - this.robot.y;
      const len = Math.hypot(dx, dy) || 1;
      this.robot.moveIntent = { x: (dx/len) * this.robot.moveSpeed, y: (dy/len) * this.robot.moveSpeed };
      return false;
    }
    this.robot.fireBullet({ x: e.x, y: e.y }, this.stats.basicDamage(), 12, 2, 'basic');
    this.robot.energy -= this.energyCost('basic_attack');
    this._startCd('basic_attack');
    AudioManager.play('basic_attack');
    return true;
  }

  _dash(toward) {
    const e = this.ctx.nearestEnemyTo({ x: this.robot.x, y: this.robot.y });
    if (!e) return false;
    let dx = e.x - this.robot.x, dy = e.y - this.robot.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
    if (!toward) { dx = -dx; dy = -dy; }
    this.robot.doDash({ x: dx, y: dy }, this.stats.stat('dash_distance', 3), 0.15);
    this.robot.energy -= this.energyCost('dash_toward');
    this._startCd(toward ? 'dash_toward' : 'dash_away');
    AudioManager.play('dash');
    return true;
  }

  _shield() {
    const dur = this.stats.stat('shield_dur', 2);
    const reduce = this.stats.stat('shield_reduce', 0.70);
    this.robot.activateShield(dur, reduce);
    this.robot.energy -= this.energyCost('shield');
    this._startCd('shield');
    AudioManager.play('shield_on');
    return true;
  }

  _interruptShot() {
    const casters = this.ctx.castingEnemies();
    if (casters.length === 0) return false;
    let target = null, best = Infinity;
    for (const c of casters) {
      const d = Math.hypot(c.x - this.robot.x, c.y - this.robot.y);
      if (d < best) { best = d; target = c; }
    }
    if (!target) return false;
    const a = GameDatabase.getAction('interrupt_shot');
    const ev = a.effectValue;
    this.robot.fireBullet({ x: target.x, y: target.y }, ev.dmg, ev.bulletSpeed, ev.bulletLife, 'interrupt', target);
    this.robot.energy -= this.energyCost('interrupt_shot');
    this._startCd('interrupt_shot');
    AudioManager.play('interrupt_success');
    return true;
  }

  _overdrive() {
    const a = GameDatabase.getAction('overdrive');
    const ev = a.effectValue;
    const dur = this.stats.stat('overdrive_dur', 5);
    this.robot.activateOverdrive(dur, ev.atkSpdMul, ev.moveSpdMul);
    this.robot.energy -= this.energyCost('overdrive');
    this._startCd('overdrive');
    this.ctx.overlogic.addEvent('overdrive', 10);
    AudioManager.play('shield_on');
    return true;
  }

  _repair() {
    const a = GameDatabase.getAction('repair');
    const ev = a.effectValue;
    this.robot.heal(ev.heal);
    this.robot.energy -= this.energyCost('repair');
    this._startCd('repair');
    AudioManager.play('shield_on');
    return true;
  }

  _dropMine() {
    const a = GameDatabase.getAction('drop_mine');
    const ev = a.effectValue;
    this.robot.spawnMine(ev.triggerRadius, ev.explosionRadius, ev.dmg);
    this.robot.energy -= this.energyCost('drop_mine');
    this._startCd('drop_mine');
    AudioManager.play('basic_attack');
  }

  // Cooldown fraction for HUD (0 = ready, 1 = just used).
  cooldownFraction(actionId) {
    const rem = this.cooldowns.get(actionId);
    if (typeof rem !== 'number') return 0;
    const total = this.stats.actionCooldown(actionId, this.robot);
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, rem / total));
  }
}

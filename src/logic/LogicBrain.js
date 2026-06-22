// LogicBrain.js — tick-driven brain. Every tickInterval seconds, gathers valid rules,
// picks highest priority, executes via ActionExecutor, emits current-logic label.
// Mirrors scripts/logic/LogicBrain.gd.

import { GameState } from '../core/GameState.js';
import { GameDatabase } from '../core/GameDatabase.js';
import { ConditionEvaluator } from './ConditionEvaluator.js';
import { sortDesc, formatLabel } from './LogicRule.js';

const TICK_INTERVAL = 0.15;     // seconds (DESIGN.md §5.2)

export class LogicBrain {
  constructor() {
    this.robot = null;
    this.ctx = null;
    this.executor = null;
    this.tracker = null;
    this.evaluator = new ConditionEvaluator();
    this.tickTimer = 0;
    this.currentRule = null;
    this.currentLabel = 'Idle: default behavior';
    // overlogic fast-switch detection
    this.recentRuleIds = [];
    this.recentRuleWindow = 0;
    this.onLabel = null;        // callback(label, rule)
  }

  setup(robot, ctx, executor, tracker) {
    this.robot = robot;
    this.ctx = ctx;
    this.executor = executor;
    this.tracker = tracker;
    this.tickTimer = 0;
    this.currentRule = null;
    this.recentRuleIds = [];
    this.recentRuleWindow = 0;
  }

  // dt is already combat-speed-scaled.
  tick(dt) {
    if (!this.robot || this.robot.dead) return;
    this.tickTimer += dt;
    this.recentRuleWindow += dt;
    if (this.recentRuleWindow >= 0.5) {
      this.recentRuleWindow = 0;
      this.recentRuleIds = [];
    }
    if (this.tickTimer >= TICK_INTERVAL) {
      this.tickTimer = 0;
      this._tick();
    }
  }

  _tick() {
    const rules = GameState.rules;
    const valid = [];
    for (const r of rules) {
      if (r.enabled === false) continue;
      const actId = r.actionId;
      if (this.executor.isOnCooldown(actId)) continue;
      if (this.robot.energy < this.executor.energyCost(actId)) continue;
      // interrupt_shot requires a casting target to be considered usable
      if (actId === 'interrupt_shot' && this.ctx.castingEnemies().length === 0) continue;
      if (this.evaluator.evaluate(this.robot, this.ctx, r)) valid.push(r);
    }
    if (valid.length === 0) {
      this.executor.executeDefault();
      this._emit(null, 'Idle: default behavior');
      return;
    }
    const sorted = sortDesc(valid);
    const chosen = sorted[0];
    const ok = this.executor.execute(chosen.actionId);
    if (ok) {
      this._trackAndOverlogic(chosen);
      this._emit(chosen, formatLabel(chosen, GameDatabase));
    } else {
      this.executor.executeDefault();
      this._emit(null, 'Idle: default behavior');
    }
  }

  _trackAndOverlogic(rule) {
    if (this.tracker) this.tracker.recordAction(rule.actionId);
    if (!this.recentRuleIds.includes(rule.id)) {
      this.recentRuleIds.push(rule.id);
      if (this.recentRuleIds.length >= 3) {
        this.ctx.overlogic.addEvent('fast_switch', 8);
      }
    }
  }

  _emit(rule, label) {
    this.currentRule = rule;
    this.currentLabel = label;
    if (this.onLabel) this.onLabel(label, rule);
  }
}

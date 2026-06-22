// ConditionEvaluator.js — stateless evaluator. evaluate(robot, ctx, rule) -> bool.
// Mirrors scripts/logic/ConditionEvaluator.gd.

export class ConditionEvaluator {
  evaluate(robot, ctx, rule) {
    const condId = rule.conditionId;
    const val = rule.conditionValue;
    switch (condId) {
      case 'enemy_nearby': {
        const r = +val;
        return ctx.nearestEnemyDistance({ x: robot.x, y: robot.y }) <= r;
      }
      case 'enemy_far': {
        const d = +val;
        const nd = ctx.nearestEnemyDistance({ x: robot.x, y: robot.y });
        return Number.isFinite(nd) && nd >= d;
      }
      case 'hp_low': {
        const p = +val;
        return robot.hp / robot.maxHp <= p;
      }
      case 'energy_high': {
        const p = +val;
        return robot.energy / robot.maxEnergy >= p;
      }
      case 'enemy_casting':
        return ctx.anyEnemyCasting();
      case 'surrounded': {
        if (!Array.isArray(val) || val.length < 2) return false;
        const radius = +val[0], count = val[1] | 0;
        return ctx.countEnemiesWithin({ x: robot.x, y: robot.y }, radius) >= count;
      }
      case 'enemy_hp_low': {
        const e = ctx.nearestEnemyTo({ x: robot.x, y: robot.y });
        if (!e) return false;
        const p = +val;
        return e.hp / e.maxHp <= p;
      }
      case 'boss_phase': {
        if (!ctx.boss || ctx.boss.dead) return false;
        return ctx.boss.currentPhase === (val | 0);
      }
      default:
        return false;
    }
  }
}

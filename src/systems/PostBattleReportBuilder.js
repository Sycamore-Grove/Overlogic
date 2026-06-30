// PostBattleReportBuilder.js — deterministic report text from a tracker snapshot.
import { GameDatabase } from '../core/GameDatabase.js';

export function buildReport(report, availableActionIds, availableConditionIds = []) {
  const damageBySource = report.damage_by_source || {};
  const actionUsage = report.action_usage || {};
  const shieldActivatedAtHp = report.shield_activated_at_hp ?? -1;
  const energyOverflowTime = report.energy_overflow_time ?? 0;
  const deathHp = report.death_hp ?? 0;
  const deathEnergy = report.death_energy ?? 0;
  const deathNearbyEnemyCount = report.death_nearby_enemy_count ?? 0;
  const interruptMisses = report.interrupt_misses ?? 0;
  const hasAction = (id) => availableActionIds.includes(id);
  const hasCondition = (id) => availableConditionIds.includes(id);

  // Damage lines (sorted desc by amount)
  const damageLines = [];
  const sources = Object.keys(damageBySource)
    .sort((a, b) => damageBySource[b] - damageBySource[a]);
  for (const s of sources) {
    const ed = GameDatabase.getEnemy(s);
    const display = (ed && ed.displayName) || s;
    damageLines.push(`- Took ${Math.round(damageBySource[s])} dmg from ${display}`);
  }
  if (damageLines.length === 0) damageLines.push('- No damage taken');

  // Most used action
  let mostUsed = '', mostUsedCount = 0;
  for (const [act, n] of Object.entries(actionUsage)) {
    if (n > mostUsedCount) { mostUsedCount = n; mostUsed = act; }
  }
  const mostUsedName = mostUsed
    ? (GameDatabase.getAction(mostUsed)?.displayName || mostUsed) : 'none';
  const mostUsedLine = `- Most used action: ${mostUsedName} (x${mostUsedCount})`;

  // Never used actions (from available set)
  const neverUsed = [];
  for (const act of availableActionIds) {
    if (!actionUsage[act] || actionUsage[act] === 0) {
      neverUsed.push(GameDatabase.getAction(act)?.displayName || act);
    }
  }
  const neverUsedLine = `- Never used: ${neverUsed.length > 0 ? neverUsed.join(', ') : 'none'}`;

  // Shield
  let shieldLine = '- Shield: never used';
  if (shieldActivatedAtHp >= 0) {
    const pct = Math.round(shieldActivatedAtHp * 100);
    shieldLine = pct < 15
      ? `- Shield used at ${pct}% HP (too late)`
      : `- Shield used at ${pct}% HP`;
  }

  const energyLine = `- Energy overflowed for ${energyOverflowTime.toFixed(1)}s total`;
  const deathLine = `- Death: HP=${Math.round(deathHp)}, Energy=${Math.round(deathEnergy)}, nearby enemies=${deathNearbyEnemyCount}`;

  // Suggestions (deterministic with auto-add metadata)
  const suggestions = [];
  
  if (interruptMisses >= 2 && hasCondition('enemy_casting') && hasAction('interrupt_shot')) {
    suggestions.push({
      text: 'Add IF Enemy Casting THEN Interrupt Shot',
      rule: { conditionId: 'enemy_casting', conditionValue: null, actionId: 'interrupt_shot', priority: 90 }
    });
  }
  if (deathNearbyEnemyCount >= 3 && hasCondition('surrounded') && hasAction('dash_away')) {
    suggestions.push({
      text: 'Add IF Surrounded THEN Dash Away',
      rule: { conditionId: 'surrounded', conditionValue: [4, 3], actionId: 'dash_away', priority: 85 }
    });
  } else if (deathNearbyEnemyCount >= 3 && hasCondition('enemy_nearby') && hasAction('dash_away')) {
    suggestions.push({
      text: 'Add IF Enemy Nearby THEN Dash Away',
      rule: { conditionId: 'enemy_nearby', conditionValue: 3.5, actionId: 'dash_away', priority: 85 }
    });
  }
  if (shieldActivatedAtHp < 0 || shieldActivatedAtHp < 0.15) {
    suggestions.push({
      text: 'Raise priority of defensive rules (e.g. Shield or Repair)'
    });
  }
  if (energyOverflowTime > 5 && hasCondition('energy_high') && hasAction('overdrive')) {
    suggestions.push({
      text: 'Add IF Energy High THEN Overdrive',
      rule: { conditionId: 'energy_high', conditionValue: 0.8, actionId: 'overdrive', priority: 60 }
    });
  }
  
  if (suggestions.length === 0) {
    suggestions.push({
      text: 'Try increasing dash priority to keep distance'
    });
  }

  return {
    damage_lines: damageLines,
    logic_lines: [mostUsedLine, neverUsedLine, shieldLine, energyLine, deathLine],
    suggestions,
  };
}

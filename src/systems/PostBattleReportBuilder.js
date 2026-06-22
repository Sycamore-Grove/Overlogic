// PostBattleReportBuilder.js — deterministic report text from a tracker snapshot.
// Mirrors scripts/systems/PostBattleReportBuilder.gd.

import { GameDatabase } from '../core/GameDatabase.js';

export function buildReport(report, availableActionIds) {
  // Damage lines (sorted desc by amount)
  const damageLines = [];
  const sources = Object.keys(report.damage_by_source)
    .sort((a, b) => report.damage_by_source[b] - report.damage_by_source[a]);
  for (const s of sources) {
    const ed = GameDatabase.getEnemy(s);
    const display = (ed && ed.displayName) || s;
    damageLines.push(`- Took ${Math.round(report.damage_by_source[s])} dmg from ${display}`);
  }
  if (damageLines.length === 0) damageLines.push('- No damage taken');

  // Most used action
  let mostUsed = '', mostUsedCount = 0;
  for (const [act, n] of Object.entries(report.action_usage)) {
    if (n > mostUsedCount) { mostUsedCount = n; mostUsed = act; }
  }
  const mostUsedName = mostUsed
    ? (GameDatabase.getAction(mostUsed)?.displayName || mostUsed) : 'none';
  const mostUsedLine = `- Most used action: ${mostUsedName} (x${mostUsedCount})`;

  // Never used actions (from available set)
  const neverUsed = [];
  for (const act of availableActionIds) {
    if (!report.action_usage[act] || report.action_usage[act] === 0) {
      neverUsed.push(GameDatabase.getAction(act)?.displayName || act);
    }
  }
  const neverUsedLine = `- Never used: ${neverUsed.length > 0 ? neverUsed.join(', ') : 'none'}`;

  // Shield
  let shieldLine = '- Shield: never used';
  if (report.shield_activated_at_hp >= 0) {
    const pct = Math.round(report.shield_activated_at_hp * 100);
    shieldLine = pct < 15
      ? `- Shield used at ${pct}% HP (too late)`
      : `- Shield used at ${pct}% HP`;
  }

  const energyLine = `- Energy overflowed for ${report.energy_overflow_time.toFixed(1)}s total`;
  const deathLine = `- Death: HP=${Math.round(report.death_hp)}, Energy=${Math.round(report.death_energy)}, nearby enemies=${report.death_nearby_enemy_count}`;

  // Suggestions (deterministic)
  const suggestions = [];
  if (report.interrupt_misses >= 2) suggestions.push('Add IF Enemy Casting THEN Interrupt Shot');
  if (report.death_nearby_enemy_count >= 3) suggestions.push('Add IF Surrounded THEN Dash Away');
  if (report.shield_activated_at_hp < 0 || report.shield_activated_at_hp < 0.15)
    suggestions.push('Raise priority of defensive rules');
  if (report.energy_overflow_time > 5 && availableActionIds.includes('overdrive'))
    suggestions.push('Add IF Energy High THEN Overdrive');
  if (suggestions.length === 0) suggestions.push('Try increasing dash priority to keep distance');

  return {
    damage_lines: damageLines,
    logic_lines: [mostUsedLine, neverUsedLine, shieldLine, energyLine, deathLine],
    suggestions,
  };
}

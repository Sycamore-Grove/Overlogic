// LogicRule.js — rule sorting helper. Pure function, mirrors scripts/logic/LogicRule.gd.

// Stable sort by priority descending. JS Array.sort is stable in modern engines.
export function sortDesc(rules) {
  return [...rules].sort((a, b) => b.priority - a.priority);
}

// Format a rule for HUD display: "[P{n}] IF Cond val THEN Action"
export function formatLabel(rule, db) {
  if (!rule || !rule.conditionId) return 'Idle: default behavior';
  const c = db.getCondition(rule.conditionId);
  const a = db.getAction(rule.actionId);
  const cName = c ? c.displayName : rule.conditionId;
  const aName = a ? a.displayName : rule.actionId;
  let vStr = '';
  const v = rule.conditionValue;
  if (typeof v === 'number') {
    vStr = c && c.parameterType === 'percent' ? ` ${Math.round(v * 100)}%` : ` ${v.toFixed(1)}`;
  } else if (Array.isArray(v)) {
    vStr = ` (${v[0].toFixed(1)},${v[1].toFixed(0)})`;
  }
  return `[P${rule.priority|0}] IF ${cName}${vStr} THEN ${aName}`;
}

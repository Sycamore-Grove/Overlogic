// RewardManager.js — builds 3 reward options for the just-won battle.
// Mirrors scripts/systems/RewardManager.gd.

import { GameDatabase } from '../core/GameDatabase.js';
import { GameState } from '../core/GameState.js';

export function buildRewardOptions(battle) {
  const pool = battle.rewardPool || [];
  const available = [];
  for (const rid of pool) {
    const r = GameDatabase.getReward(rid);
    if (!r) continue;
    if (r.rewardType === 'new_action' && GameState.unlockedActionIds.includes(r.targetId)) continue;
    if (r.rewardType === 'new_condition' && GameState.unlockedConditionIds.includes(r.targetId)) continue;
    available.push(rid);
  }
  // Ensure at least 1 passive
  let hasPassive = available.some(rid => GameDatabase.getReward(rid).rewardType === 'passive');
  if (!hasPassive) {
    for (const r of GameDatabase.allRewards()) {
      if (r.rewardType === 'passive' && !available.includes(r.id)) {
        available.push(r.id);
        break;
      }
    }
  }
  // Shuffle + take 3
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, Math.min(3, available.length));
}

// Reward display description helper.
export function rewardDescription(reward) {
  switch (reward.rewardType) {
    case 'passive':    return `Permanent stat upgrade (${reward.targetId})`;
    case 'new_action': return `Unlock new action module: ${reward.targetId}`;
    case 'new_condition': return `Unlock new condition module: ${reward.targetId}`;
    default: return '';
  }
}

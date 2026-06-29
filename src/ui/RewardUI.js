// RewardUI.js — reward selection screen. Shows 3 cards, applies on click.
// Enhanced with current passives display and richer card descriptions.
// Mirrors scripts/ui/RewardUI.gd.

import { GameState } from '../core/GameState.js';
import { GameDatabase } from '../core/GameDatabase.js';
import { GameManager } from '../core/GameManager.js';
import { buildRewardOptions, rewardDescription } from '../systems/RewardManager.js';
import { AudioManager } from '../systems/AudioManager.js';

const TYPE_ICONS = {
  passive: '⚙️',
  new_action: '⚡',
  new_condition: '🔍',
};

export class RewardUI {
  constructor() {
    this.el = document.getElementById('screen-reward');
    this.optionsEl = document.getElementById('reward-options');
    this._currentOptions = [];
  }

  show() {
    const justWonBattle = GameDatabase.getBattle(GameState.currentBattleIndex);
    this._currentOptions = buildRewardOptions(justWonBattle);
    this._render();
  }

  _render() {
    this.optionsEl.innerHTML = '';

    // Remove old summary bar if re-rendering
    const oldBar = this.el.querySelector('.reward-summary-bar');
    if (oldBar) oldBar.remove();

    // Current status summary bar (inserted before the options grid)
    const hpPct = Math.round((GameState.persistentHp || GameState.stats.max_hp) / GameState.stats.max_hp * 100);
    const summaryBar = document.createElement('div');
    summaryBar.className = 'reward-summary-bar';
    summaryBar.innerHTML = `
      <span class="reward-summary-label">Current State:</span>
      <span class="reward-summary-stat">❤️ HP ${hpPct}%</span>
      <span class="reward-summary-stat">⚡ ${GameState.stats.max_energy} EN</span>
      <span class="reward-summary-stat">🗡️ ${Math.round(GameState.stats.basic_dmg * 10) / 10} ATK</span>
      <span class="reward-summary-stat" style="color: #a0a0a0; font-size: 10px;">
        ${GameState.unlockedActionIds.length} extra actions · ${GameState.unlockedConditionIds.length} extra conditions
      </span>
    `;
    this.optionsEl.before(summaryBar);

    if (this._currentOptions.length === 0) {
      const btn = document.createElement('button');
      btn.className = 'btn primary big'; btn.textContent = 'Continue';
      btn.addEventListener('click', () => GameManager.onRewardChosen(''));
      this.optionsEl.appendChild(btn);
      return;
    }

    for (const rid of this._currentOptions) {
      const r = GameDatabase.getReward(rid);
      if (!r) continue;
      const card = document.createElement('div');
      card.className = 'reward-card';
      const icon = TYPE_ICONS[r.rewardType] || '✦';
      const typeLabel = r.rewardType.replace('_', ' ').toUpperCase();
      card.innerHTML =
        `<span class="r-type">${icon} ${typeLabel}</span>` +
        `<span class="r-name">${r.displayName}</span>` +
        `<span class="r-desc">${rewardDescription(r)}</span>` +
        `<span class="r-pick-hint">Click to Select</span>`;
      card.addEventListener('click', () => {
        AudioManager.play('rule_add');
        GameManager.onRewardChosen(rid);
      });
      this.optionsEl.appendChild(card);
    }
  }
}

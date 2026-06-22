// RewardUI.js — reward selection screen. Shows 3 cards, applies on click.
// Mirrors scripts/ui/RewardUI.gd.

import { GameState } from '../core/GameState.js';
import { GameDatabase } from '../core/GameDatabase.js';
import { GameManager } from '../core/GameManager.js';
import { buildRewardOptions, rewardDescription } from '../systems/RewardManager.js';
import { AudioManager } from '../systems/AudioManager.js';

export class RewardUI {
  constructor() {
    this.el = document.getElementById('screen-reward');
    this.optionsEl = document.getElementById('reward-options');
    this._currentOptions = [];
  }

  show() {
    // GameManager.goRewardSelection is called BEFORE onBattleWon, so the index
    // still points at the just-won battle.
    const justWonBattle = GameDatabase.getBattle(GameState.currentBattleIndex);
    this._currentOptions = buildRewardOptions(justWonBattle);
    this._render();
  }

  _render() {
    this.optionsEl.innerHTML = '';
    if (this._currentOptions.length === 0) {
      // No rewards (shouldn't happen for normal battles) — auto-advance
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
      card.innerHTML =
        `<span class="r-type">${r.rewardType.replace('_', ' ')}</span>` +
        `<span class="r-name">${r.displayName}</span>` +
        `<span class="r-desc">${rewardDescription(r)}</span>`;
      card.addEventListener('click', () => {
        AudioManager.play('rule_add');
        GameManager.onRewardChosen(rid);
      });
      this.optionsEl.appendChild(card);
    }
  }
}

// PostBattleReportUI.js — failure debug report. Mirrors scripts/ui/PostBattleReportUI.gd.

import { GameState } from '../core/GameState.js';
import { GameManager } from '../core/GameManager.js';
import { buildReport } from '../systems/PostBattleReportBuilder.js';
import { AudioManager } from '../systems/AudioManager.js';

export class PostBattleReportUI {
  constructor() {
    this.el = document.getElementById('screen-report');
    this.repDamage = document.getElementById('rep-damage');
    this.repLogic  = document.getElementById('rep-logic');
    this.repSuggest = document.getElementById('rep-suggest');
    this.btnRetry  = document.getElementById('btn-retry');
    this.btnEdit   = document.getElementById('btn-edit');
    this.btnRestart = document.getElementById('btn-restart');
    this._bind();
  }

  _bind() {
    this.btnRetry.addEventListener('click', () => {
      AudioManager.play('button_click');
      GameManager.onReportRetryBattle();
    });
    this.btnEdit.addEventListener('click', () => {
      AudioManager.play('button_click');
      GameManager.onReportEditLogic();
    });
    this.btnRestart.addEventListener('click', () => {
      AudioManager.play('button_click');
      GameManager.onReportRestartRun();
    });
  }

  show() {
    const report = GameState.lastReport || {};
    const availableActions = GameState.availableActionIds();
    const built = buildReport(report, availableActions);
    this.repDamage.innerHTML = built.damage_lines.map(s => `<li>${s}</li>`).join('');
    this.repLogic.innerHTML  = built.logic_lines.map(s => `<li>${s}</li>`).join('');
    this.repSuggest.innerHTML = built.suggestions.map(s => `<li>${s}</li>`).join('');
  }
}

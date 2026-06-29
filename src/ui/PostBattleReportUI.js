// PostBattleReportUI.js — failure debug report. Mirrors scripts/ui/PostBattleReportUI.gd.

import { GameState } from '../core/GameState.js';
import { GameManager } from '../core/GameManager.js';
import { buildReport } from '../systems/PostBattleReportBuilder.js';
import { AudioManager } from '../systems/AudioManager.js';
import { drawStatsChart } from './StatsChart.js';

export class PostBattleReportUI {
  constructor() {
    this.el = document.getElementById('screen-report');
    this.repDamage = document.getElementById('rep-damage');
    this.repLogic  = document.getElementById('rep-logic');
    this.repSuggest = document.getElementById('rep-suggest');
    this.canvas = document.getElementById('chart-report');
    this.btnRetry  = document.getElementById('btn-retry');
    this.btnEdit   = document.getElementById('btn-edit');
    this.btnRestart = document.getElementById('btn-restart');
    this._bind();

    // Redraw charts on window resize to ensure high-DPI canvas looks sharp
    window.addEventListener('resize', () => {
      if (this.el && !this.el.classList.contains('hidden')) {
        const report = GameState.lastReport || {};
        drawStatsChart(this.canvas, report);
      }
    });
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
    
    // Clear and build suggestions with interactive Auto-Add buttons
    this.repSuggest.innerHTML = '';
    for (const sug of built.suggestions) {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.gap = '12px';
      li.style.padding = '4px 0';

      const spanText = document.createElement('span');
      spanText.textContent = sug.text;
      li.appendChild(spanText);

      if (sug.rule) {
        const addBtn = document.createElement('button');
        addBtn.className = 'btn small primary';
        addBtn.textContent = '+ Auto-Add';
        addBtn.style.padding = '3px 8px';
        addBtn.style.fontSize = '10px';
        addBtn.style.minHeight = '24px';
        addBtn.style.whiteSpace = 'nowrap';
        
        addBtn.addEventListener('click', () => {
          // Add the recommended rule to the active rule list
          GameState.pushUndoState();
          GameState.addRule(
            sug.rule.conditionId,
            sug.rule.conditionValue,
            sug.rule.actionId,
            sug.rule.priority
          );
          AudioManager.play('rule_add');
          
          // Disable button to show it has been successfully added
          addBtn.disabled = true;
          addBtn.textContent = 'Added ✔';
          addBtn.classList.remove('primary');
          addBtn.style.opacity = '0.6';
        });
        li.appendChild(addBtn);
      }
      this.repSuggest.appendChild(li);
    }
    
    // Draw performance charts
    drawStatsChart(this.canvas, report);
  }
}

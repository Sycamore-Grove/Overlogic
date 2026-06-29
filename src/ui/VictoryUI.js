// VictoryUI.js — demo cleared screen. Mirrors scripts/ui/VictoryUI.gd.

import { GameManager } from '../core/GameManager.js';
import { GameState } from '../core/GameState.js';
import { AudioManager } from '../systems/AudioManager.js';
import { drawStatsChart } from './StatsChart.js';

export class VictoryUI {
  constructor() {
    this.el = document.getElementById('screen-victory');
    this.canvas = document.getElementById('chart-victory');
    this.btn = document.getElementById('btn-victory-menu');
    this.btn.addEventListener('click', () => {
      AudioManager.play('button_click');
      GameManager.goMainMenu();
    });
  }

  show() {
    const report = GameState.lastReport || {};
    drawStatsChart(this.canvas, report);
  }
}

// VictoryUI.js — demo cleared screen. Mirrors scripts/ui/VictoryUI.gd.

import { GameManager } from '../core/GameManager.js';
import { AudioManager } from '../systems/AudioManager.js';

export class VictoryUI {
  constructor() {
    this.el = document.getElementById('screen-victory');
    this.btn = document.getElementById('btn-victory-menu');
    this.btn.addEventListener('click', () => {
      AudioManager.play('button_click');
      GameManager.goMainMenu();
    });
  }
}

// MainMenu.js — main menu screen controller. Wires buttons, resumes audio on first click.

import { GameManager } from '../core/GameManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { GameState } from '../core/GameState.js';

export class MainMenu {
  constructor() {
    this.el = document.getElementById('screen-main');
    this.btnStart = document.getElementById('btn-start');
    this.btnHow = document.getElementById('btn-how');
    this.btnReset = document.getElementById('btn-reset');
    this.btnExit = document.getElementById('btn-exit');
    this.overlay = document.getElementById('how-overlay');
    this.btnHowClose = document.getElementById('btn-how-close');
    this._bind();
  }

  _bind() {
    this.btnStart.addEventListener('click', () => {
      AudioManager.resume();
      AudioManager.play('button_click');
      GameManager.goLogicEdit();
    });
    this.btnHow.addEventListener('click', () => {
      AudioManager.resume();
      AudioManager.play('button_click');
      this.overlay.classList.remove('hidden');
    });
    this.btnHowClose.addEventListener('click', () => {
      AudioManager.play('button_click');
      this.overlay.classList.add('hidden');
    });
    this.btnReset.addEventListener('click', () => {
      AudioManager.resume();
      AudioManager.play('button_click');
      if (confirm('Are you sure you want to reset all progress, rules, and upgrades?')) {
        GameState.clearStorage();
        this.btnReset.textContent = 'Reset Successful';
        setTimeout(() => { this.btnReset.textContent = 'Reset Progress'; }, 1500);
      }
    });
    this.btnExit.addEventListener('click', () => {
      AudioManager.play('button_click');
      try { window.close(); } catch (e) {}
      this.btnExit.textContent = 'Close tab manually';
    });
  }
}

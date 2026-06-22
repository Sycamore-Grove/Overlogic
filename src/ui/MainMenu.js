// MainMenu.js — main menu screen controller. Wires buttons, resumes audio on first click.

import { GameManager } from '../core/GameManager.js';
import { AudioManager } from '../systems/AudioManager.js';

export class MainMenu {
  constructor() {
    this.el = document.getElementById('screen-main');
    this.btnStart = document.getElementById('btn-start');
    this.btnHow = document.getElementById('btn-how');
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
    this.btnExit.addEventListener('click', () => {
      AudioManager.play('button_click');
      // browser: try to close tab; fall back to a message
      try { window.close(); } catch (e) {}
      this.btnExit.textContent = 'Close tab manually';
    });
  }
}

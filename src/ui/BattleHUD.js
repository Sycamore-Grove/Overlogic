// BattleHUD.js — combat overlay. HP/Energy/Overlogic bars, current logic line, wave,
// timer, pause/speed/quit buttons, boss bar, phase toast. Mirrors scripts/ui/BattleHUD.gd.

import { GameManager } from '../core/GameManager.js';
import { AudioManager } from '../systems/AudioManager.js';

export class BattleHUD {
  constructor(arena) {
    this.arena = arena;   // CombatArena instance (set later by main)
    this.hpFill = document.getElementById('hp-fill');
    this.hpText = document.getElementById('hp-text');
    this.enFill = document.getElementById('en-fill');
    this.enText = document.getElementById('en-text');
    this.olFill = document.getElementById('ol-fill');
    this.olText = document.getElementById('ol-text');
    this.curLogic = document.getElementById('current-logic');
    this.waveInfo = document.getElementById('wave-info');
    this.timerEl = document.getElementById('combat-timer');
    this.btnPause = document.getElementById('btn-pause');
    this.btnSpeed = document.getElementById('btn-speed');
    this.btnQuit  = document.getElementById('btn-quit');
    this.bossWrap = document.getElementById('boss-bar-wrap');
    this.bossName = document.getElementById('boss-name');
    this.bossFill = document.getElementById('boss-fill');
    this.phaseToast = document.getElementById('phase-toast');
    this._lastRuleId = null;
    this._bind();
  }

  _bind() {
    this.btnPause.addEventListener('click', () => {
      if (!this.arena) return;
      this.arena.togglePause();
      this.btnPause.textContent = this.arena.paused ? 'Resume' : 'Pause';
      AudioManager.play('button_click');
    });
    this.btnSpeed.addEventListener('click', () => {
      if (!this.arena) return;
      const s = this.arena.toggleSpeed();
      this.btnSpeed.textContent = `Speed x${s}`;
      AudioManager.play('button_click');
    });
    this.btnQuit.addEventListener('click', () => {
      AudioManager.play('button_click');
      if (this.arena) this.arena.stop();
      GameManager.goLogicEdit();
    });
  }

  onBattleStart(battle) {
    this.btnPause.textContent = 'Pause';
    this.btnSpeed.textContent = 'Speed x1';
    this.curLogic.textContent = 'Current Logic: —';
    this.curLogic.classList.remove('overlogic');
    this.hideBossBar();
    this.hidePhaseToast();
  }

  setHp(hp, mx) {
    this.hpFill.style.width = `${Math.max(0, (hp / mx) * 100)}%`;
    this.hpText.textContent = `${Math.max(0, hp)|0} / ${mx|0}`;
  }
  setEnergy(en, mx) {
    this.enFill.style.width = `${Math.max(0, (en / mx) * 100)}%`;
    this.enText.textContent = `${Math.max(0, en)|0} / ${mx|0}`;
  }
  setOverlogic(val, active) {
    this.olFill.style.width = `${Math.max(0, Math.min(100, val))}%`;
    this.olText.textContent = active ? 'ACTIVE' : `${val|0}`;
  }
  setShield(on)    { /* visual handled in renderer */ }
  setOverdrive(on) { /* visual handled in renderer */ }

  setCurrentLogic(label, rule, overlogicActive) {
    const txt = overlogicActive && rule ? `Overlogic Active: ${label}` : `Current Logic: ${label}`;
    this.curLogic.textContent = txt;
    this.curLogic.classList.toggle('overlogic', !!overlogicActive && !!rule);
    // flash effect on rule switch (DESIGN.md §13.3: 0.2s highlight)
    if (rule && this._lastRuleId !== rule.id) {
      this._lastRuleId = rule.id;
      this.curLogic.classList.remove('flash');
      // force reflow so the class re-applies cleanly on rapid switches
      void this.curLogic.offsetWidth;
      this.curLogic.classList.add('flash');
    }
  }

  setWave(cur, total) { this.waveInfo.textContent = `Wave ${cur}/${total}`; }
  setTimer(t) { this.timerEl.textContent = `${t.toFixed(1)}s`; }

  showBossBar(name) { this.bossName.textContent = name; this.bossWrap.classList.remove('hidden'); }
  hideBossBar() { this.bossWrap.classList.add('hidden'); }
  setBossHp(hp, mx) { this.bossFill.style.width = `${Math.max(0, (hp / mx) * 100)}%`; }

  showPhaseToast(text) { this.phaseToast.textContent = text; this.phaseToast.classList.remove('hidden'); }
  hidePhaseToast() { this.phaseToast.classList.add('hidden'); }
}

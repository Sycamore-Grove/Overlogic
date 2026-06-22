// AudioManager.js — procedural SFX via Web Audio API. No asset files needed.
// Mirrors scripts/systems/AudioManager.gd. Singleton instance exported.

class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this._lastPlay = new Map();   // event -> timestamp
    this.THROTTLE = 0.03;         // min seconds between same-event plays
  }

  // Must be called after a user gesture (browser autoplay policy).
  resume() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { this.enabled = false; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  _tone(freq, dur, vol, type) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  play(event) {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now() / 1000;
    const last = this._lastPlay.get(event) || 0;
    if (now - last < this.THROTTLE) return;
    this._lastPlay.set(event, now);
    switch (event) {
      case 'button_click':    this._tone(660, 0.05, 0.18, 'sine'); break;
      case 'rule_add':        this._tone(880, 0.08, 0.22, 'sine'); break;
      case 'battle_start':    this._tone(220, 0.30, 0.30, 'sawtooth'); break;
      case 'basic_attack':    this._tone(440, 0.06, 0.14, 'square'); break;
      case 'shield_on':       this._tone(330, 0.20, 0.22, 'sine'); break;
      case 'dash':            this._tone(1200, 0.08, 0.18, 'sawtooth'); break;
      case 'interrupt_success': this._tone(1500, 0.12, 0.32, 'sine'); break;
      case 'enemy_death':     this._tone(200, 0.15, 0.22, 'sawtooth'); break;
      case 'boss_phase':      this._tone(110, 0.50, 0.36, 'sawtooth'); break;
      case 'defeat':          this._tone(80,  0.80, 0.30, 'sawtooth'); break;
      case 'victory':         this._tone(660, 0.40, 0.30, 'sine'); break;
      case 'mine_explosion':  this._tone(150, 0.25, 0.24, 'sawtooth'); break;
      default: break;
    }
  }
}

export const AudioManager = new AudioManager();

// CombatArena.js — combat driver. Spawns waves, runs tick loop, renders, judges win/loss.
// Mirrors scripts/core/CombatArena.gd. Owns the rAF loop.

import { BattleContext } from './BattleContext.js';
import { RobotController } from '../robot/RobotController.js';
import { RobotStats } from '../robot/RobotStats.js';
import { LogicBrain } from '../logic/LogicBrain.js';
import { ActionExecutor } from '../logic/ActionExecutor.js';
import { Camera } from '../render/Camera.js';
import { drawArena } from '../render/ArenaRenderer.js';
import { GameDatabase } from './GameDatabase.js';
import { GameState } from './GameState.js';
import { AudioManager } from '../systems/AudioManager.js';
import { CrawlerEnemy } from '../enemies/CrawlerEnemy.js';
import { ShooterEnemy } from '../enemies/ShooterEnemy.js';
import { ChargerEnemy } from '../enemies/ChargerEnemy.js';
import { BossProtocolWarden } from '../enemies/BossProtocolWarden.js';
import { spawnBurst } from '../vfx/ParticleSystem.js';

const WAVE_INTERVAL = 2;     // seconds between waves
const ENEMY_CLASSES = {
  crawler: CrawlerEnemy,
  shooter: ShooterEnemy,
  charger: ChargerEnemy,
  boss_warden: BossProtocolWarden,
};

export class CombatArena {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.hud = hud;            // BattleHUD instance
    this.ctx = null;
    this.robot = null;
    this.stats = null;
    this.brain = null;
    this.executor = null;
    this.camera = new Camera();
    this.battle = null;
    this.pendingWaves = [];    // [{enemyId, count, at}]
    this.currentWave = 0;
    this.totalWaves = 0;
    this.paused = false;
    this.speed = 1;
    this.lastTs = 0;
    this.battleTime = 0;
    this._rafId = 0;
    this._finished = false;
    this._noEnemyTime = 0;     // for overlogic OOC decay
    this.onFinished = null;    // callback(won)
    this._phaseToastTimer = 0;
  }

  start(battle) {
    this.battle = battle;
    this._finished = false;
    this.battleTime = 0;
    this._noEnemyTime = 0;
    this.paused = false;
    this.speed = 1;
    this.currentWave = 0;

    // Fresh context + robot + brain
    this.ctx = new BattleContext();
    this.stats = new RobotStats();
    this.stats.loadFromGameState();
    this.robot = new RobotController();
    this.robot.initFromStats(this.stats, this.ctx);
    this.ctx.robot = this.robot;
    this.executor = new ActionExecutor();
    this.executor.setup(this.robot, this.ctx, this.stats, this.ctx.tracker);
    this.brain = new LogicBrain();
    this.brain.setup(this.robot, this.ctx, this.executor, this.ctx.tracker);
    this.brain.onLabel = (label, rule) => this.hud.setCurrentLogic(label, rule, this.ctx.overlogic.active);

    // Wire robot HUD callbacks
    this.robot.onHp = (hp, mx) => this.hud.setHp(hp, mx);
    this.robot.onEnergy = (en, mx) => this.hud.setEnergy(en, mx);
    this.robot.onShield = (on) => this.hud.setShield(on);
    this.robot.onOverdrive = (on) => this.hud.setOverdrive(on);
    this.robot.onDied = () => this._finish(false);

    // Build wave spawn schedule
    const waves = {};
    for (const s of battle.enemySpawns) {
      if (!waves[s.wave]) waves[s.wave] = [];
      waves[s.wave].push(s);
    }
    this.totalWaves = Object.keys(waves).length;
    this.pendingWaves = [];
    let waveNum = 0;
    for (const w of Object.keys(waves).sort((a, b) => +a - +b)) {
      waveNum += 1;
      this.pendingWaves.push({ wave: +w, spawns: waves[w], at: waveNum === 1 ? 0 : (waveNum - 1) * WAVE_INTERVAL });
    }

    // Boss wiring
    AudioManager.play('battle_start');
    this.hud.onBattleStart(battle);
    this.lastTs = performance.now();
    this._loop(this.lastTs);
  }

  _loop(ts) {
    if (this._finished) return;
    this._rafId = requestAnimationFrame((t) => this._loop(t));
    const realDt = Math.min(0.05, (ts - this.lastTs) / 1000); // cap to avoid huge jumps
    this.lastTs = ts;
    if (this.paused) { this._render(); return; }
    const dt = realDt * this.speed;
    this._update(dt);
    this._render();
  }

  _update(dt) {
    this.battleTime += dt;
    this.ctx.time = this.battleTime;
    this.ctx.timeSpeed = this.speed;

    // Spawn pending waves
    for (let i = this.pendingWaves.length - 1; i >= 0; i--) {
      const w = this.pendingWaves[i];
      if (this.battleTime >= w.at) {
        this._spawnWave(w.spawns);
        this.currentWave += 1;
        this.hud.setWave(this.currentWave, this.totalWaves);
        this.pendingWaves.splice(i, 1);
      }
    }

    // Edge-detect casting-seen for stats
    if (this.ctx.tickCastingEdge()) this.ctx.tracker.recordCastingSeen();

    // Robot tick
    this.robot.tick(dt);
    // Logic brain tick (may fire actions)
    this.brain.tick(dt);
    // Executor cooldowns
    this.executor.tick(dt);
    // Enemies
    for (const e of this.ctx.enemies) e.tick(dt);
    // Projectiles
    for (const p of [...this.ctx.projectiles]) p.tick(dt);
    // Mines
    for (const m of [...this.ctx.mines]) m.tick(dt);
    // Particles
    for (const p of this.ctx.particles) p.tick(dt);
    this.ctx.particles = this.ctx.particles.filter(p => !p.dead);
    // Clean dead enemies (removed immediately on death; brief death burst is spawned in takeDamage)
    this.ctx.enemies = this.ctx.enemies.filter(e => !e.dead);

    // Tracker time + overlogic
    this.ctx.tracker.tick(dt);
    const inCombat = this.ctx.liveEnemies() > 0;
    if (!inCombat) this._noEnemyTime += dt; else this._noEnemyTime = 0;
    this.ctx.overlogic.tick(dt, inCombat);
    this.hud.setOverlogic(this.ctx.overlogic.value, this.ctx.overlogic.active);

    // Camera
    this.camera.follow(this.robot, dt);
    this.camera.tick(dt);
    if (this._phaseToastTimer > 0) {
      this._phaseToastTimer -= dt;
      if (this._phaseToastTimer <= 0) this.hud.hidePhaseToast();
    }

    // Boss bar
    if (this.ctx.boss) {
      this.hud.setBossHp(this.ctx.boss.hp, this.ctx.boss.maxHp);
    }

    // Win check: all waves spawned AND no live enemies
    if (this.pendingWaves.length === 0 && this.ctx.liveEnemies() === 0 && !this.robot.dead) {
      this._finish(true);
    }
  }

  _spawnWave(spawns) {
    for (const s of spawns) {
      const data = GameDatabase.getEnemy(s.enemyId);
      if (!data) continue;
      for (let i = 0; i < s.count; i++) {
        const Cls = ENEMY_CLASSES[s.enemyId] || CrawlerEnemy;
        const e = new Cls();
        e.init(data, this.ctx);
        // spawn at arena edge, distributed around ring
        const ang = (i / Math.max(1, s.count)) * Math.PI * 2 + Math.random() * 0.4;
        const r = 8 + Math.random() * 1;
        const pos = this.ctx.clampToArena({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
        e.x = pos.x; e.y = pos.y;
        this.ctx.enemies.push(e);
        if (s.enemyId === 'boss_warden') {
          this.ctx.boss = e;
          e.onPhaseChanged = (p) => {
            this.camera.shake(0.3, 8);
            this.hud.showPhaseToast(`PROTOCOL WARDEN: PHASE ${p}`);
            this._phaseToastTimer = 1.6;
          };
          this.hud.showBossBar(data.displayName);
        }
      }
    }
  }

  _render() {
    drawArena(this.g, this.canvas, this.ctx, this.camera);
    this.hud.setTimer(this.battleTime);
  }

  _finish(won) {
    if (this._finished) return;
    this._finished = true;
    cancelAnimationFrame(this._rafId);
    // snapshot death state if lost
    if (!won) {
      this.ctx.tracker.snapshotDeath(
        this.robot.hp, this.robot.energy,
        this.ctx.countEnemiesWithin({ x: this.robot.x, y: this.robot.y }, 4)
      );
      AudioManager.play('defeat');
      // store report for PostBattleReportUI
      GameState.lastReport = this.ctx.tracker.toReport();
    } else {
      AudioManager.play('victory');
    }
    this.hud.hideBossBar();
    if (this.onFinished) this.onFinished(won);
  }

  setPaused(p) { this.paused = p; }
  togglePause() { this.paused = !this.paused; }
  setSpeed(s) { this.speed = s; }
  toggleSpeed() { this.speed = this.speed === 1 ? 2 : 1; return this.speed; }

  stop() {
    this._finished = true;
    cancelAnimationFrame(this._rafId);
  }
}

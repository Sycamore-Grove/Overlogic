// CombatStatsTracker.js — per-battle statistics for the post-battle report.
// Mirrors scripts/systems/CombatStatsTracker.gd. Pure class.

export class CombatStatsTracker {
  constructor() {
    this.damageBySource = new Map();   // sourceKind -> float
    this.actionUsage = new Map();      // actionId -> int
    this.actionLastUsedTime = new Map();
    this.interruptSuccesses = 0;
    this.castingEventsSeen = 0;
    this.castingEventsInterrupted = 0;
    this.shieldActivatedAtHp = -1;
    this.energyOverflowTime = 0;
    this.battleTime = 0;
    this.deathHp = 0;
    this.deathEnergy = 0;
    this.deathNearbyEnemyCount = 0;
    this.lowHpKills = 0;
  }

  recordDamageTaken(amount, source) {
    this.damageBySource.set(source, (this.damageBySource.get(source) || 0) + amount);
  }
  recordAction(actionId) {
    this.actionUsage.set(actionId, (this.actionUsage.get(actionId) || 0) + 1);
    this.actionLastUsedTime.set(actionId, this.battleTime);
  }
  recordEnergyOverflow(dt) { this.energyOverflowTime += dt; }
  recordInterruptSuccess() { this.interruptSuccesses += 1; this.castingEventsInterrupted += 1; }
  recordCastingSeen() { this.castingEventsSeen += 1; }
  recordShieldActivated(hpPct) { this.shieldActivatedAtHp = hpPct; }   // latest activation wins
  recordLowHpKill() { this.lowHpKills += 1; }
  recordEnemyDeath(enemyId) { /* hook for future use; matches Godot base no-op */ }
  tick(dt) { this.battleTime += dt; }
  snapshotDeath(hp, energy, nearby) {
    this.deathHp = hp; this.deathEnergy = energy; this.deathNearbyEnemyCount = nearby;
  }

  toReport() {
    return {
      damage_by_source: Object.fromEntries(this.damageBySource),
      action_usage: Object.fromEntries(this.actionUsage),
      action_last_used_time: Object.fromEntries(this.actionLastUsedTime),
      interrupt_successes: this.interruptSuccesses,
      interrupt_misses: Math.max(0, this.castingEventsSeen - this.castingEventsInterrupted),
      shield_activated_at_hp: this.shieldActivatedAtHp,
      energy_overflow_time: this.energyOverflowTime,
      battle_time: this.battleTime,
      death_hp: this.deathHp,
      death_energy: this.deathEnergy,
      death_nearby_enemy_count: this.deathNearbyEnemyCount,
      low_hp_kills: this.lowHpKills,
    };
  }
}

# CombatStatsTracker.gd
# Records per-battle statistics for the post-battle report. RefCounted.
extends RefCounted

var damage_by_source: Dictionary = {}      # sourceKind -> float
var action_usage: Dictionary = {}          # actionId -> int
var action_last_used_time: Dictionary = {} # actionId -> float
var interrupt_successes: int = 0
var interrupt_misses: int = 0
var shield_activated_at_hp: float = -1.0
var energy_overflow_time: float = 0.0
var casting_events_seen: int = 0
var casting_events_interrupted: int = 0
var battle_time: float = 0.0
var death_hp: float = 0.0
var death_energy: float = 0.0
var death_nearby_enemy_count: int = 0
var low_hp_kills: int = 0

func record_damage_taken(amount: float, source: String) -> void:
	damage_by_source[source] = float(damage_by_source.get(source, 0.0)) + amount

func record_action(action_id: String) -> void:
	action_usage[action_id] = int(action_usage.get(action_id, 0)) + 1
	action_last_used_time[action_id] = battle_time

func record_energy_overflow(dt: float) -> void:
	energy_overflow_time += dt

func record_interrupt_success() -> void:
	interrupt_successes += 1
	casting_events_interrupted += 1

func record_casting_seen() -> void:
	casting_events_seen += 1

func record_shield_activated(hp_pct: float) -> void:
	if shield_activated_at_hp < 0.0:
		shield_activated_at_hp = hp_pct

func record_enemy_death(enemy_id: String) -> void:
	# low-hp kill tracking handled by caller via add_kill_at_low_hp
	pass

func record_low_hp_kill() -> void:
	low_hp_kills += 1

func tick(dt: float) -> void:
	battle_time += dt

func snapshot_death(hp: float, energy: float, nearby: int) -> void:
	death_hp = hp
	death_energy = energy
	death_nearby_enemy_count = nearby

func to_report() -> Dictionary:
	return {
		"damage_by_source": damage_by_source,
		"action_usage": action_usage,
		"action_last_used_time": action_last_used_time,
		"interrupt_successes": interrupt_successes,
		"interrupt_misses": max(0, casting_events_seen - casting_events_interrupted),
		"shield_activated_at_hp": shield_activated_at_hp,
		"energy_overflow_time": energy_overflow_time,
		"battle_time": battle_time,
		"death_hp": death_hp,
		"death_energy": death_energy,
		"death_nearby_enemy_count": death_nearby_enemy_count,
		"low_hp_kills": low_hp_kills
	}

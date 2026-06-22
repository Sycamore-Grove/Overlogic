# OverlogicSystem.gd
# Tracks Overlogic value and active state. RefCounted, lives in BattleContext.
extends RefCounted

var value: float = 0.0
var active: bool = false
const THRESHOLD: float = 70.0
const ACTIVE_OFF: float = 40.0
const DECAY_RATE: float = 2.0
const DECAY_RATE_OOC: float = 5.0
const MAX_VAL: float = 100.0

var last_event_time: float = 0.0

func add_event(event_kind: String, amount: float) -> void:
	value = clampf(value + amount, 0.0, MAX_VAL)
	last_event_time = 0.0
	_check_state()

func add_kill_at_low_hp(killed_at_hp_pct: float) -> void:
	if killed_at_hp_pct < 0.20:
		add_event("low_hp_kill", 12.0)

func tick(dt: float, in_combat: bool) -> void:
	last_event_time += dt
	var rate: float = DECAY_RATE_OOC if not in_combat else DECAY_RATE
	value = clampf(value - rate * dt, 0.0, MAX_VAL)
	_check_state()

func _check_state() -> void:
	if not active and value >= THRESHOLD:
		active = true
	elif active and value < ACTIVE_OFF:
		active = false

func atk_cd_mul() -> float:
	return 0.7 if active else 1.0

func skill_cd_mul() -> float:
	return 0.7 if active else 1.0

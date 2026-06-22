# ActionExecutor.gd
# Executes actions on the robot. Tracks per-action cooldowns. Node so it can use _process.
extends Node

var robot: Node = null                 # RobotController
var ctx: RefCounted = null             # BattleContext
var stats: RefCounted = null           # RobotStats
var tracker: RefCounted = null         # CombatStatsTracker

var cooldowns: Dictionary = {}         # actionId -> remaining seconds

func setup(p_robot: Node, p_ctx: RefCounted, p_stats: RefCounted, p_tracker: RefCounted) -> void:
	robot = p_robot
	ctx = p_ctx
	stats = p_stats
	tracker = p_tracker
	cooldowns.clear()

func _process(delta: float) -> void:
	var speed: float = ctx.time_speed if ctx != null else 1.0
	for k in cooldowns.keys():
		cooldowns[k] = float(cooldowns[k]) - delta * speed
		if float(cooldowns[k]) <= 0.0:
			cooldowns.erase(k)

func is_on_cooldown(action_id: String) -> bool:
	return cooldowns.has(action_id) and float(cooldowns[action_id]) > 0.0

func energy_cost(action_id: String) -> float:
	return stats.action_energy_cost(action_id)

func _start_cd(action_id: String) -> void:
	cooldowns[action_id] = stats.action_cooldown(action_id, robot)

# Returns true if action actually executed.
func execute(action_id: String) -> bool:
	if is_on_cooldown(action_id):
		return false
	var cost: float = energy_cost(action_id)
	if robot.energy < cost:
		return false
	match action_id:
		"basic_attack":     return _basic_attack()
		"dash_toward":      return _dash(true)
		"dash_away":        return _dash(false)
		"shield":           return _shield()
		"interrupt_shot":   return _interrupt_shot()
		"overdrive":        return _overdrive()
		"repair":           return _repair()
		"drop_mine":        _drop_mine(); return true
		_: return false

func execute_default() -> void:
	# Move toward nearest enemy slowly; idle if none.
	var e: Node = ctx.nearest_enemy_to(robot.global_position)
	if e == null:
		return
	var dir: Vector2 = (e.global_position - robot.global_position).normalized()
	robot.move_intent = dir * robot.move_speed * 0.6

func _basic_attack() -> bool:
	var e: Node = ctx.nearest_enemy_to(robot.global_position)
	if e == null:
		return false
	var dist: float = robot.global_position.distance_to(e.global_position)
	if dist > stats.action_range("basic_attack"):
		# move toward
		var dir: Vector2 = (e.global_position - robot.global_position).normalized()
		robot.move_intent = dir * robot.move_speed
		# don't consume CD/energy if out of range — treat as not executed
		return false
	robot.fire_bullet(e.global_position, stats.basic_damage(), 12.0, 2.0, "basic")
	robot.energy -= energy_cost("basic_attack")
	_start_cd("basic_attack")
	AudioManager.play("basic_attack")
	return true

func _dash(toward: bool) -> bool:
	var e: Node = ctx.nearest_enemy_to(robot.global_position)
	if e == null:
		return false
	var dir: Vector2 = (e.global_position - robot.global_position).normalized()
	if not toward:
		dir = -dir
	robot.do_dash(dir, float(stats.stat("dash_distance", 3.0)), 0.15)
	robot.energy -= energy_cost("dash_toward")
	_start_cd("dash_toward" if toward else "dash_away")
	AudioManager.play("dash")
	return true

func _shield() -> bool:
	var dur: float = float(stats.stat("shield_dur", 2.0))
	var reduce: float = float(stats.stat("shield_reduce", 0.70))
	robot.activate_shield(dur, reduce)
	robot.energy -= energy_cost("shield")
	_start_cd("shield")
	AudioManager.play("shield_on")
	return true

func _interrupt_shot() -> bool:
	var casters: Array = ctx.casting_enemies()
	if casters.is_empty():
		return false
	# nearest caster
	var target: Node = null
	var best_d: float = INF
	for c in casters:
		var d: float = robot.global_position.distance_to(c.global_position)
		if d < best_d:
			best_d = d
			target = c
	if target == null:
		return false
	var a: Dictionary = GameDatabase.get_action("interrupt_shot")
	var ev: Dictionary = a.get("effectValue", {})
	robot.fire_bullet(target.global_position, float(ev.get("dmg", 6.0)), float(ev.get("bulletSpeed", 14.0)), float(ev.get("bulletLife", 2.0)), "interrupt", target)
	robot.energy -= energy_cost("interrupt_shot")
	_start_cd("interrupt_shot")
	AudioManager.play("interrupt_success")
	return true

func _overdrive() -> bool:
	var a: Dictionary = GameDatabase.get_action("overdrive")
	var ev: Dictionary = a.get("effectValue", {})
	# duration is base + passive bonus
	var dur: float = float(stats.stat("overdrive_dur", 5.0))
	robot.activate_overdrive(dur, float(ev.get("atkSpdMul", 1.5)), float(ev.get("moveSpdMul", 1.25)))
	robot.energy -= energy_cost("overdrive")
	_start_cd("overdrive")
	ctx.overlogic.add_event("overdrive", 10)
	AudioManager.play("shield_on")
	return true

func _repair() -> bool:
	var a: Dictionary = GameDatabase.get_action("repair")
	var ev: Dictionary = a.get("effectValue", {})
	robot.heal(float(ev.get("heal", 25.0)))
	robot.energy -= energy_cost("repair")
	_start_cd("repair")
	AudioManager.play("shield_on")
	return true

func _drop_mine() -> void:
	# spawn mine at robot pos
	var a: Dictionary = GameDatabase.get_action("drop_mine")
	var ev: Dictionary = a.get("effectValue", {})
	robot.spawn_mine(float(ev.get("triggerRadius", 1.5)), float(ev.get("explosionRadius", 2.0)), float(ev.get("dmg", 20.0)))
	robot.energy -= energy_cost("drop_mine")
	_start_cd("drop_mine")
	AudioManager.play("basic_attack")

# Cooldown fraction for HUD (0 = ready, 1 = just used).
func cooldown_fraction(action_id: String) -> float:
	if not cooldowns.has(action_id):
		return 0.0
	var rem: float = float(cooldowns[action_id])
	var total: float = stats.action_cooldown(action_id, robot)
	if total <= 0.0:
		return 0.0
	return clampf(rem / total, 0.0, 1.0)

# ChargerEnemy.gd
extends "res://scripts/enemies/EnemyBase.gd"

var charge_speed: float = 7.0
var charge_telegraph: float = 1.2
var charge_distance: float = 6.0
var charge_timer: float = 0.0
var charge_state: String = "idle"   # idle / casting / charging / cooldown
var charge_dir: Vector2 = Vector2.ZERO
var charge_remaining: float = 0.0
var telegraph_visual: ColorRect = null

func init(p_data: Dictionary, p_ctx: RefCounted) -> void:
	super.init(p_data, p_ctx)
	charge_speed = float(data.get("chargeSpeed", 7.0))
	charge_telegraph = float(data.get("chargeTelegraph", 1.2))
	charge_distance = float(data.get("chargeDistance", 6.0))

func is_casting() -> bool:
	return charge_state == "casting"

func interrupt() -> void:
	if charge_state == "casting":
		charge_state = "idle"
		charge_timer = 0.0
		if telegraph_visual != null:
			telegraph_visual.queue_free()
			telegraph_visual = null

func _tick_behavior(dt: float) -> void:
	var robot_pos: Vector2 = ctx.robot.global_position
	var dir: Vector2 = (robot_pos - global_position).normalized()
	var dist: float = global_position.distance_to(robot_pos)
	match charge_state:
		"idle":
			if dist <= 5.0 and attack_timer <= 0.0:
				charge_state = "casting"
				charge_timer = charge_telegraph
				_show_telegraph()
			else:
				state = "chasing"
				global_position += dir * move_speed * dt
				global_position = ctx.clamp_to_arena(global_position)
		"casting":
			state = "casting"
			charge_timer -= dt
			if charge_timer <= 0.0:
				charge_state = "charging"
				charge_dir = dir
				charge_remaining = charge_distance
				if telegraph_visual != null:
					telegraph_visual.queue_free()
					telegraph_visual = null
		"charging":
			state = "charging"
			var step: float = charge_speed * dt
			global_position += charge_dir * step
			global_position = ctx.clamp_to_arena(global_position)
			charge_remaining -= step
			# contact with robot
			if global_position.distance_to(robot_pos) <= body_radius + ctx.robot.body_radius:
				ctx.robot.take_damage(damage, enemy_id)
				charge_state = "idle"
				attack_timer = attack_cooldown
			elif charge_remaining <= 0.0 or global_position == ctx.clamp_to_arena(global_position):
				charge_state = "idle"
				attack_timer = attack_cooldown

func _show_telegraph() -> void:
	telegraph_visual = ColorRect.new()
	telegraph_visual.size = Vector2(60.0, 60.0)
	telegraph_visual.position = Vector2(-30.0, -30.0)
	telegraph_visual.color = Color(1.0, 0.1, 0.1, 0.6)
	add_child(telegraph_visual)

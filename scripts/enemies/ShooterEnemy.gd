# ShooterEnemy.gd
extends "res://scripts/enemies/EnemyBase.gd"

var projectile_speed: float = 8.0
var projectile_life: float = 3.0
var kite_distance: float = 3.0

func init(p_data: Dictionary, p_ctx: RefCounted) -> void:
	super.init(p_data, p_ctx)
	projectile_speed = float(data.get("projectileSpeed", 8.0))
	projectile_life = float(data.get("projectileLife", 3.0))
	kite_distance = float(data.get("kiteDistance", 3.0))

func _tick_behavior(dt: float) -> void:
	var robot_pos: Vector2 = ctx.robot.global_position
	var dir: Vector2 = (robot_pos - global_position).normalized()
	var dist: float = global_position.distance_to(robot_pos)
	if dist < kite_distance:
		# back away
		state = "kiting"
		global_position += -dir * move_speed * dt
		global_position = ctx.clamp_to_arena(global_position)
	elif dist > attack_range:
		state = "chasing"
		global_position += dir * move_speed * dt
		global_position = ctx.clamp_to_arena(global_position)
	else:
		state = "attacking"
		if attack_timer <= 0.0:
			_fire_at(robot_pos)
			attack_timer = attack_cooldown

func _fire_at(target: Vector2) -> void:
	var p: Node = preload("res://scripts/vfx/Projectile.gd").new()
	var dir: Vector2 = (target - global_position).normalized()
	p.setup(global_position, dir, projectile_speed, projectile_life, damage, "enemy", false)
	p.set_ctx(ctx)
	ctx.projectiles.append(p)
	get_parent().add_child(p)

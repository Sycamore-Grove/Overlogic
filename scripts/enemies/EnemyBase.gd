# EnemyBase.gd
# Base enemy. Subclasses override _tick_behavior(dt).
extends CharacterBody2D

var enemy_id: String = ""
var max_hp: float = 20.0
var hp: float = 20.0
var move_speed: float = 2.5
var damage: float = 8.0
var attack_range: float = 1.0
var attack_cooldown: float = 1.2
var body_radius: float = 0.35
var data: Dictionary = {}

var dead: bool = false
var attack_timer: float = 0.0
var ctx: RefCounted = null
var state: String = "chasing"

var visual: ColorRect = null

signal died

func _ready() -> void:
	var size: float = body_radius * 40.0
	visual = ColorRect.new()
	visual.size = Vector2(size, size)
	visual.position = Vector2(-size / 2.0, -size / 2.0)
	var c: Array = data.get("color", [1.0, 0.3, 0.3])
	visual.color = Color(float(c[0]), float(c[1]), float(c[2]))
	add_child(visual)
	collision_layer = 2
	collision_mask = 0

func init(p_data: Dictionary, p_ctx: RefCounted) -> void:
	data = p_data
	ctx = p_ctx
	enemy_id = data["id"]
	max_hp = float(data["maxHp"])
	hp = max_hp
	move_speed = float(data["moveSpeed"])
	damage = float(data["damage"])
	attack_range = float(data["attackRange"])
	attack_cooldown = float(data["attackCooldown"])
	body_radius = float(data.get("bodyRadius", 0.35))

func is_dead() -> bool:
	return dead

func is_casting() -> bool:
	return false

func interrupt() -> void:
	# base no-op
	pass

func take_damage(amount: float, kind: String) -> void:
	if dead:
		return
	hp -= amount
	if hp <= 0.0:
		hp = 0.0
		dead = true
		visual.color = Color(0.25, 0.25, 0.25)
		ctx.tracker.record_enemy_death(enemy_id)
		# Overlogic: low-HP kill bonus
		if ctx.robot != null and is_instance_valid(ctx.robot) and not ctx.robot.is_dead():
			var hp_pct: float = ctx.robot.hp / ctx.robot.max_hp
			if hp_pct < 0.20:
				ctx.overlogic.add_event("low_hp_kill", 12.0)
				ctx.tracker.record_low_hp_kill()
		AudioManager.play("enemy_death")
		died.emit()
		queue_free()

func _physics_process(delta: float) -> void:
	if dead or ctx == null or ctx.robot == null or not is_instance_valid(ctx.robot) or ctx.robot.is_dead():
		return
	var speed_dt: float = ctx.time_speed
	var dt: float = delta * speed_dt
	attack_timer -= dt
	_tick_behavior(dt)

# Override in subclass.
func _tick_behavior(dt: float) -> void:
	var robot_pos: Vector2 = ctx.robot.global_position
	var dir: Vector2 = (robot_pos - global_position).normalized()
	var dist: float = global_position.distance_to(robot_pos)
	if dist > attack_range:
		state = "chasing"
		global_position += dir * move_speed * dt
		global_position = ctx.clamp_to_arena(global_position)
	else:
		state = "attacking"
		if attack_timer <= 0.0:
			ctx.robot.take_damage(damage, enemy_id)
			attack_timer = attack_cooldown

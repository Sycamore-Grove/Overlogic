# Projectile.gd
# Bullet node. Player bullets damage enemies; enemy bullets damage robot.
extends Node2D

var pos: Vector2 = Vector2.ZERO
var dir: Vector2 = Vector2.ZERO
var speed: float = 12.0
var life: float = 2.0
var dmg: float = 8.0
var kind: String = "basic"       # basic / interrupt / enemy
var from_player: bool = true
var specific_target: Node = null
var visual: ColorRect = null
var ctx: RefCounted = null

func setup(start: Vector2, p_dir: Vector2, p_speed: float, p_life: float, p_dmg: float, p_kind: String, p_from_player: bool, p_target: Node = null) -> void:
	pos = start
	dir = p_dir.normalized()
	speed = p_speed
	life = p_life
	dmg = p_dmg
	kind = p_kind
	from_player = p_from_player
	specific_target = p_target

func _ready() -> void:
	global_position = pos
	var size: float = 8.0 if from_player else 10.0
	visual = ColorRect.new()
	visual.size = Vector2(size, size)
	visual.position = Vector2(-size / 2.0, -size / 2.0)
	if from_player:
		visual.color = Color(0.6, 0.95, 1.0) if kind == "basic" else Color(1.0, 0.9, 0.3)
	else:
		visual.color = Color(1.0, 0.4, 0.3)
	add_child(visual)

func set_ctx(p_ctx: RefCounted) -> void:
	ctx = p_ctx

func _physics_process(delta: float) -> void:
	if ctx == null:
		return
	var speed_dt: float = ctx.time_speed if ctx != null else 1.0
	var dt: float = delta * speed_dt
	# Mild homing for interrupt toward specific target
	if specific_target != null and is_instance_valid(specific_target) and not specific_target.is_dead():
		var desired: Vector2 = (specific_target.global_position - global_position).normalized()
		dir = desired
	global_position += dir * speed * dt
	life -= dt
	if life <= 0.0:
		_destroy()
		return
	# Collisions
	if from_player:
		for e in ctx.enemies:
			if is_instance_valid(e) and not e.is_dead():
				if global_position.distance_to(e.global_position) <= e.body_radius + 0.15:
					e.take_damage(dmg, kind)
					if kind == "interrupt":
						e.interrupt()
						ctx.tracker.record_interrupt_success()
						AudioManager.play("interrupt_success")
					_destroy()
					return
	else:
		if ctx.robot != null and is_instance_valid(ctx.robot) and not ctx.robot.is_dead():
			if global_position.distance_to(ctx.robot.global_position) <= ctx.robot.body_radius + 0.15:
				ctx.robot.take_damage(dmg, "projectile")
				_destroy()
				return

func _destroy() -> void:
	if ctx != null and ctx.projectiles.has(self):
		ctx.projectiles.erase(self)
	queue_free()

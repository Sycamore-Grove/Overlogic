# RobotController.gd
# Player robot. Driven by ActionExecutor (move_intent / do_dash / fire_bullet etc).
extends CharacterBody2D

var max_hp: float = 100.0
var hp: float = 100.0
var max_energy: float = 100.0
var energy: float = 100.0
var move_speed: float = 4.0
var body_radius: float = 0.4

var move_intent: Vector2 = Vector2.ZERO   # set by ActionExecutor each tick
var dash_velocity: Vector2 = Vector2.ZERO
var dash_timer: float = 0.0
var invuln_timer: float = 0.0

var shield_timer: float = 0.0
var shield_reduce: float = 0.0
var overdrive_timer: float = 0.0
var overdrive_atk_mul: float = 1.0
var overdrive_move_mul: float = 1.0

var dead: bool = false
var stats: RefCounted = null
var ctx: RefCounted = null

# Visual
var sprite: ColorRect = null
var shield_ring: ColorRect = null
var overdrive_glow: ColorRect = null

signal died
signal hp_changed(hp: float, max_hp: float)
signal energy_changed(energy: float, max_energy: float)
signal shield_changed(active: bool)
signal overdrive_changed(active: bool)

func _ready() -> void:
	# Build visuals procedurally.
	var size: float = body_radius * 40.0
	sprite = ColorRect.new()
	sprite.size = Vector2(size, size)
	sprite.position = Vector2(-size / 2.0, -size / 2.0)
	sprite.color = Color(0.45, 0.7, 1.0)
	add_child(sprite)

	shield_ring = ColorRect.new()
	shield_ring.size = Vector2(size * 1.6, size * 1.6)
	shield_ring.position = Vector2(-size * 0.8, -size * 0.8)
	shield_ring.color = Color(0.4, 0.9, 1.0, 0.35)
	shield_ring.visible = false
	add_child(shield_ring)

	overdrive_glow = ColorRect.new()
	overdrive_glow.size = Vector2(size * 1.3, size * 1.3)
	overdrive_glow.position = Vector2(-size * 0.65, -size * 0.65)
	overdrive_glow.color = Color(1.0, 0.85, 0.2, 0.5)
	overdrive_glow.visible = false
	add_child(overdrive_glow)

	collision_layer = 1
	collision_mask = 0

func init_from_stats(p_stats: RefCounted, p_ctx: RefCounted) -> void:
	stats = p_stats
	ctx = p_ctx
	max_hp = float(stats.stat("max_hp", 100.0))
	hp = max_hp
	max_energy = float(stats.stat("max_energy", 100.0))
	energy = max_energy
	move_speed = float(stats.stat("move_speed", 4.0))
	hp_changed.emit(hp, max_hp)
	energy_changed.emit(energy, max_energy)

func is_dead() -> bool:
	return dead

func is_casting() -> bool:
	return false

func _physics_process(delta: float) -> void:
	if dead:
		return
	var speed: float = ctx.time_speed if ctx != null else 1.0
	var dt: float = delta * speed
	# Energy regen (paused during overdrive)
	if overdrive_timer <= 0.0:
		energy = minf(max_energy, energy + float(stats.stat("energy_regen", 8.0)) * dt)
	# Energy overflow tracking
	if energy >= max_energy - 0.01 and ctx != null and ctx.tracker != null:
		ctx.tracker.record_energy_overflow(dt)
	# Cooldowns
	if invuln_timer > 0.0:
		invuln_timer -= dt
	if dash_timer > 0.0:
		dash_timer -= dt
		velocity = dash_velocity
	else:
		var spd: float = move_speed * (overdrive_move_mul if overdrive_timer > 0.0 else 1.0)
		if move_intent.length() > spd:
			velocity = move_intent.normalized() * spd
		else:
			velocity = move_intent
	# Tick down statuses
	if shield_timer > 0.0:
		shield_timer -= dt
		if shield_timer <= 0.0:
			shield_ring.visible = false
			shield_changed.emit(false)
	if overdrive_timer > 0.0:
		overdrive_timer -= dt
		if overdrive_timer <= 0.0:
			overdrive_glow.visible = false
			overdrive_atk_mul = 1.0
			overdrive_move_mul = 1.0
			overdrive_changed.emit(false)
	# Move with clamping to arena
	var next_pos: Vector2 = global_position + velocity * dt
	global_position = ctx.clamp_to_arena(next_pos)
	# NOTE: move_intent is NOT cleared here — it persists between ticks so the
	# robot keeps moving smoothly. ActionExecutor overwrites it each logic tick.
	energy_changed.emit(energy, max_energy)

# ---- Action hooks (called by ActionExecutor) ----
func do_dash(dir: Vector2, dist: float, invuln: float) -> void:
	dash_velocity = dir.normalized() * (dist / 0.15)  # cover dist over 0.15s
	dash_timer = 0.15
	invuln_timer = invuln

func activate_shield(dur: float, reduce: float) -> void:
	shield_timer = dur
	shield_reduce = reduce
	shield_ring.visible = true
	shield_changed.emit(true)
	if ctx != null and ctx.tracker != null:
		ctx.tracker.record_shield_activated(hp / max_hp)

func activate_overdrive(dur: float, atk_mul: float, move_mul: float) -> void:
	overdrive_timer = dur
	overdrive_atk_mul = atk_mul
	overdrive_move_mul = move_mul
	overdrive_glow.visible = true
	overdrive_changed.emit(true)

func heal(amount: float) -> void:
	hp = minf(max_hp, hp + amount)
	hp_changed.emit(hp, max_hp)

func overdrive_atk_speed_mul() -> float:
	return overdrive_atk_mul

func fire_bullet(target_pos: Vector2, dmg: float, speed: float, life: float, kind: String, specific_target: Node = null) -> void:
	var dir: Vector2 = (target_pos - global_position).normalized()
	var p: Node = preload("res://scripts/vfx/Projectile.gd").new()
	p.setup(global_position, dir, speed, life, dmg, kind, true, specific_target)
	ctx.projectiles.append(p)
	get_parent().add_child(p)

func spawn_mine(trigger_r: float, explosion_r: float, dmg: float) -> void:
	var m: Node = preload("res://scripts/vfx/Mine.gd").new()
	m.setup(global_position, trigger_r, explosion_r, dmg, ctx)
	ctx.mines.append(m)
	get_parent().add_child(m)

func take_damage(amount: float, source_kind: String) -> void:
	if dead or invuln_timer > 0.0:
		return
	var actual: float = amount
	if shield_timer > 0.0:
		actual = amount * (1.0 - shield_reduce)
	hp -= actual
	if ctx != null and ctx.tracker != null:
		ctx.tracker.record_damage_taken(amount, source_kind)
	if hp <= 0.0 and not dead:
		hp = 0.0
		dead = true
		sprite.color = Color(0.3, 0.3, 0.3)
		died.emit()
	hp_changed.emit(hp, max_hp)

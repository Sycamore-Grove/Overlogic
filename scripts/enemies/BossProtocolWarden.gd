# BossProtocolWarden.gd
extends "res://scripts/enemies/EnemyBase.gd"

var current_phase: int = 1
var phase2_hp_pct: float = 0.65
var phase3_hp_pct: float = 0.30

var action_timer: float = 0.0
var summon_timer: float = 8.0
var laser_timer: float = 5.0
var laser_casting_timer: float = 0.0
var laser_active: bool = false
var laser_rect: ColorRect = null
var boss_bar: ProgressBar = null

signal phase_changed(phase: int)

func init(p_data: Dictionary, p_ctx: RefCounted) -> void:
	super.init(p_data, p_ctx)
	phase2_hp_pct = float(data.get("phase2HpPct", 0.65))
	phase3_hp_pct = float(data.get("phase3HpPct", 0.30))
	max_hp = float(data["maxHp"])
	hp = max_hp
	# bigger visual
	if visual != null:
		var size: float = body_radius * 40.0
		visual.size = Vector2(size, size)
		visual.position = Vector2(-size / 2.0, -size / 2.0)

func is_casting() -> bool:
	return laser_active and laser_casting_timer > 0.0

func interrupt() -> void:
	if laser_active and laser_casting_timer > 0.0:
		laser_active = false
		laser_casting_timer = 0.0
		laser_timer = 5.0
		if laser_rect != null:
			laser_rect.queue_free()
			laser_rect = null

func take_damage(amount: float, kind: String) -> void:
	if dead:
		return
	hp -= amount
	var pct: float = hp / max_hp
	if current_phase == 1 and pct <= phase2_hp_pct:
		_enter_phase(2)
	elif current_phase == 2 and pct <= phase3_hp_pct:
		_enter_phase(3)
	if hp <= 0.0:
		hp = 0.0
		dead = true
		visual.color = Color(0.25, 0.25, 0.25)
		ctx.tracker.record_enemy_death(enemy_id)
		AudioManager.play("enemy_death")
		died.emit()
		queue_free()

func _enter_phase(p: int) -> void:
	current_phase = p
	phase_changed.emit(p)
	AudioManager.play("boss_phase")
	if get_viewport() != null:
		var cam: Camera2D = get_viewport().get_camera_2d()
		if cam != null and cam.has_method("shake"):
			cam.shake(0.3, 8.0)

func _tick_behavior(dt: float) -> void:
	var robot_pos: Vector2 = ctx.robot.global_position
	var dir: Vector2 = (robot_pos - global_position).normalized()
	var dist: float = global_position.distance_to(robot_pos)
	match current_phase:
		1:
			_phase1(dt, robot_pos, dir, dist)
		2:
			_phase2(dt, robot_pos, dir, dist)
		3:
			_phase3(dt, robot_pos, dir, dist)

# Phase 1: slow 3-spread bullets + shockwave if close
func _phase1(dt: float, robot_pos: Vector2, dir: Vector2, dist: float) -> void:
	action_timer -= dt
	if action_timer <= 0.0:
		_fire_spread(robot_pos, 3, 10.0, 6.0, 10.0)
		action_timer = 1.8
	if dist < 3.0 and attack_timer <= 0.0:
		ctx.robot.take_damage(15.0, enemy_id)
		attack_timer = 1.5

# Phase 2: faster bullets + summon crawlers
func _phase2(dt: float, robot_pos: Vector2, dir: Vector2, dist: float) -> void:
	action_timer -= dt
	if action_timer <= 0.0:
		_fire_spread(robot_pos, 3, 10.0, 6.0, 10.0)
		action_timer = 1.3
	summon_timer -= dt
	if summon_timer <= 0.0:
		_summon_crawler()
		summon_timer = 8.0
	# slow chase
	if dist > 4.0:
		global_position += dir * move_speed * dt
		global_position = ctx.clamp_to_arena(global_position)

# Phase 3: laser cast
func _phase3(dt: float, robot_pos: Vector2, dir: Vector2, dist: float) -> void:
	if not laser_active:
		laser_timer -= dt
		if laser_timer <= 0.0:
			laser_active = true
			laser_casting_timer = 1.5
			# build laser rect visual
			laser_rect = ColorRect.new()
			laser_rect.size = Vector2(8.0 * 40.0, 3.0 * 40.0)
			laser_rect.color = Color(1.0, 0.2, 0.2, 0.45)
			laser_rect.position = Vector2(0.0, -3.0 * 20.0)
			add_child(laser_rect)
			# face robot
			rotation = dir.angle()
	else:
		laser_casting_timer -= dt
		if laser_casting_timer <= 0.0:
			# fire: damage if robot in rectangle ahead
			_check_laser_hit(robot_pos)
			laser_rect.queue_free()
			laser_rect = null
			laser_active = false
			laser_timer = 5.0
			rotation = 0.0

func _check_laser_hit(robot_pos: Vector2) -> void:
	var local: Vector2 = (robot_pos - global_position).rotated(-rotation)
	if local.x >= 0.0 and local.x <= 8.0 and absf(local.y) <= 1.5:
		ctx.robot.take_damage(30.0, enemy_id)

func _fire_spread(target: Vector2, count: int, dmg: float, speed: float, spread_deg: float) -> void:
	var base_dir: Vector2 = (target - global_position).normalized()
	var spread: float = deg_to_rad(spread_deg)
	for i in range(count):
		var offset: float = spread * (i - (count - 1) / 2.0)
		var d: Vector2 = base_dir.rotated(offset)
		var p: Node = preload("res://scripts/vfx/Projectile.gd").new()
		p.setup(global_position, d, speed, 3.0, dmg, "enemy", false)
		p.set_ctx(ctx)
		ctx.projectiles.append(p)
		get_parent().add_child(p)

func _summon_crawler() -> void:
	# don't exceed 4 crawlers
	var live_crawlers: int = 0
	for e in ctx.enemies:
		if is_instance_valid(e) and not e.is_dead() and e.enemy_id == "crawler":
			live_crawlers += 1
	if live_crawlers >= 4:
		return
	for _i in range(2):
		if live_crawlers >= 4:
			break
		var crawler_data: Dictionary = GameDatabase.get_enemy("crawler")
		var crawler: Node = preload("res://scripts/enemies/CrawlerEnemy.gd").new()
		crawler.init(crawler_data, ctx)
		var angle: float = randf() * TAU
		crawler.global_position = global_position + Vector2(cos(angle), sin(angle)) * 1.5
		ctx.enemies.append(crawler)
		get_parent().add_child(crawler)
		live_crawlers += 1

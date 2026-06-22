# Mine.gd
# Static explosive. Detonates when enemy within trigger radius.
extends Node2D

var pos: Vector2 = Vector2.ZERO
var trigger_radius: float = 1.5
var explosion_radius: float = 2.0
var dmg: float = 20.0
var ctx: RefCounted = null
var armed: bool = true
var visual: ColorRect = null

func setup(start: Vector2, tr: float, er: float, p_dmg: float, p_ctx: RefCounted) -> void:
	pos = start
	trigger_radius = tr
	explosion_radius = er
	dmg = p_dmg
	ctx = p_ctx

func _ready() -> void:
	global_position = pos
	visual = ColorRect.new()
	visual.size = Vector2(12.0, 12.0)
	visual.position = Vector2(-6.0, -6.0)
	visual.color = Color(0.3, 1.0, 0.4)
	add_child(visual)

func _physics_process(delta: float) -> void:
	if not armed or ctx == null:
		return
	for e in ctx.enemies:
		if is_instance_valid(e) and not e.is_dead():
			if global_position.distance_to(e.global_position) <= trigger_radius:
				_detonate()
				return

func _detonate() -> void:
	armed = false
	for e in ctx.enemies:
		if is_instance_valid(e) and not e.is_dead():
			if global_position.distance_to(e.global_position) <= explosion_radius:
				e.take_damage(dmg, "mine")
	AudioManager.play("interrupt_success")
	if ctx != null and ctx.mines.has(self):
		ctx.mines.erase(self)
	queue_free()

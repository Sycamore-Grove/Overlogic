# BattleContext.gd
# Per-battle shared context. Holds references to all enemies, projectiles, mines,
# elapsed time, and the combat stats tracker. Created fresh by ArenaManager each battle.
extends RefCounted

var robot: CharacterBody2D = null
var enemies: Array = []            # live EnemyBase nodes
var projectiles: Array = []        # live Projectile nodes
var mines: Array = []              # live Mine nodes
var time: float = 0.0
var arena_half_size: float = 10.0  # 20x20 arena
var tracker: RefCounted = null     # CombatStatsTracker
var overlogic: RefCounted = null   # OverlogicSystem
var boss: Node = null              # boss reference if present
var time_speed: float = 1.0        # combat speed multiplier (x1 / x2)
var last_casting_state: bool = false  # for casting-seen edge detection

func nearest_enemy_to(pos: Vector2) -> Node:
	var best: Node = null
	var best_d: float = INF
	for e in enemies:
		if is_instance_valid(e) and not e.is_dead():
			var d: float = e.global_position.distance_to(pos)
			if d < best_d:
				best_d = d
				best = e
	return best

func nearest_enemy_distance(pos: Vector2) -> float:
	var e := nearest_enemy_to(pos)
	if e == null:
		return INF
	return pos.distance_to(e.global_position)

func count_enemies_within(pos: Vector2, radius: float) -> int:
	var n: int = 0
	for e in enemies:
		if is_instance_valid(e) and not e.is_dead():
			if pos.distance_to(e.global_position) <= radius:
				n += 1
	return n

func any_enemy_casting() -> bool:
	for e in enemies:
		if is_instance_valid(e) and not e.is_dead() and e.is_casting():
			return true
	return false

func casting_enemies() -> Array:
	var out: Array = []
	for e in enemies:
		if is_instance_valid(e) and not e.is_dead() and e.is_casting():
			out.append(e)
	return out

func live_enemies() -> int:
	var n: int = 0
	for e in enemies:
		if is_instance_valid(e) and not e.is_dead():
			n += 1
	return n

func clamp_to_arena(pos: Vector2) -> Vector2:
	var h := arena_half_size - 0.4
	return Vector2(clampf(pos.x, -h, h), clampf(pos.y, -h, h))

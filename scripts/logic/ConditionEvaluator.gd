# ConditionEvaluator.gd
# Stateless evaluator. Evaluate(robot, ctx, rule) -> bool.
# robot: RobotController; ctx: BattleContext; rule: Dictionary.
extends RefCounted

func evaluate(robot: Node, ctx: RefCounted, rule: Dictionary) -> bool:
	var cond_id: String = rule["conditionId"]
	var val: Variant = rule["conditionValue"]
	match cond_id:
		"enemy_nearby":
			var r: float = float(val)
			return ctx.nearest_enemy_distance(robot.global_position) <= r
		"enemy_far":
			var d: float = float(val)
			var nd: float = ctx.nearest_enemy_distance(robot.global_position)
			return is_inf(nd) == false and nd >= d
		"hp_low":
			var p: float = float(val)
			return robot.hp / robot.max_hp <= p
		"energy_high":
			var p: float = float(val)
			return robot.energy / robot.max_energy >= p
		"enemy_casting":
			return ctx.any_enemy_casting()
		"surrounded":
			# val is [radius, count]
			if val is Array and val.size() >= 2:
				var radius: float = float(val[0])
				var count: int = int(val[1])
				return ctx.count_enemies_within(robot.global_position, radius) >= count
			return false
		"enemy_hp_low":
			var e: Node = ctx.nearest_enemy_to(robot.global_position)
			if e == null:
				return false
			var p: float = float(val)
			return e.hp / e.max_hp <= p
		"boss_phase":
			if ctx.boss == null or not is_instance_valid(ctx.boss):
				return false
			return ctx.boss.current_phase == int(val)
		_:
			return false

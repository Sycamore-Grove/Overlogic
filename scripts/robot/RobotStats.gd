# RobotStats.gd
# Reads base stats from GameState.stats and exposes computed per-action cooldowns
# and effect values (so passive upgrades apply uniformly). RefCounted, lives with robot.
extends RefCounted

var base: Dictionary = {}

func load_from_game_state() -> void:
	base = GameState.stats.duplicate(true)

func stat(key: String, default: Variant = 0.0) -> Variant:
	return base.get(key, default)

# Per-action effective cooldown (after passives + overdrive + overlogic).
# Multipliers express SPEED-up: cooldown = base_cd / mul. Higher mul = shorter cd.
# robot_ref: optional RobotController to read overdrive/overlogic multipliers.
func action_cooldown(action_id: String, robot_ref: Node = null) -> float:
	var base_cd: float = _base_cd(action_id)
	var mul: float = 1.0
	if robot_ref != null and is_instance_valid(robot_ref):
		if robot_ref.has_method("overdrive_atk_speed_mul"):
			mul *= robot_ref.overdrive_atk_speed_mul()
		# overlogic: atk/skill cooldown reduction (mul > 1 = faster)
		if "ctx" in robot_ref and robot_ref.ctx != null and robot_ref.ctx.overlogic != null:
			if action_id == "basic_attack" or action_id == "interrupt_shot":
				# atk_cd_mul returns 0.7 when active; convert to speed-up mul of 1/0.7
				mul *= 1.0 / robot_ref.ctx.overlogic.atk_cd_mul()
			else:
				mul *= 1.0 / robot_ref.ctx.overlogic.skill_cd_mul()
	if mul <= 0.01:
		mul = 0.01
	return base_cd / mul

func _base_cd(action_id: String) -> float:
	match action_id:
		"basic_attack": return float(base["basic_cd"])
		"dash_toward", "dash_away": return float(base["dash_cd"])
		"shield": return float(base["shield_cd"])
		"interrupt_shot": return float(base["interrupt_cd"])
		"overdrive": return float(base["overdrive_cd"])
		"repair":
			var a: Dictionary = GameDatabase.get_action("repair")
			return float(a.get("cooldown", 12.0))
		"drop_mine":
			var a: Dictionary = GameDatabase.get_action("drop_mine")
			return float(a.get("cooldown", 6.0))
		_: return 1.0

func action_energy_cost(action_id: String) -> float:
	var a: Dictionary = GameDatabase.get_action(action_id)
	return float(a.get("energyCost", 0))

func action_range(action_id: String) -> float:
	var a: Dictionary = GameDatabase.get_action(action_id)
	return float(a.get("range", 0.0))

func basic_damage() -> float:
	return float(base["basic_dmg"])

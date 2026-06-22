# LogicBrain.gd
# Tick-driven brain. Every tick_interval seconds, gathers valid rules,
# picks highest priority, executes via ActionExecutor. Shows current logic.
extends Node

var robot: Node = null                # RobotController
var ctx: RefCounted = null            # BattleContext
var evaluator: RefCounted = null      # ConditionEvaluator
var executor: Node = null             # ActionExecutor
var tracker: RefCounted = null        # CombatStatsTracker

var tick_interval: float = 0.15
var tick_timer: float = 0.0
var speed_mul: float = 1.0

var current_rule: Dictionary = {}
var recent_rule_ids: Array = []       # for overlogic fast-switch detection
var recent_rule_window: float = 0.0

signal current_logic_changed(rule: Dictionary, label: String)

func setup(p_robot: Node, p_ctx: RefCounted, p_executor: Node, p_tracker: RefCounted) -> void:
	robot = p_robot
	ctx = p_ctx
	executor = p_executor
	tracker = p_tracker
	evaluator = preload("res://scripts/logic/ConditionEvaluator.gd").new()
	tick_timer = 0.0
	current_rule = {}
	recent_rule_ids.clear()

func _process(delta: float) -> void:
	if robot == null or not is_instance_valid(robot) or robot.is_dead():
		return
	var scaled: float = delta * speed_mul
	tick_timer += scaled
	# overlogic fast-switch window
	recent_rule_window += scaled
	if recent_rule_window >= 0.5:
		recent_rule_window = 0.0
		recent_rule_ids.clear()
	if tick_timer >= tick_interval:
		tick_timer = 0.0
		_tick()

func _tick() -> void:
	var rules: Array = GameState.rules
	var valid: Array = []
	for r in rules:
		if not bool(r.get("enabled", true)):
			continue
		var act_id: String = r["actionId"]
		if executor.is_on_cooldown(act_id):
			continue
		if robot.energy < executor.energy_cost(act_id):
			continue
		# interrupt_shot requires a casting target to be considered usable
		if act_id == "interrupt_shot" and ctx.casting_enemies().is_empty():
			continue
		if evaluator.evaluate(robot, ctx, r):
			valid.append(r)
	if valid.is_empty():
		executor.execute_default()
		_emit_label({}, "Idle: default behavior")
		return
	valid = preload("res://scripts/logic/LogicRule.gd").sort_desc(valid)
	var chosen: Dictionary = valid[0]
	# Execute
	var ok: bool = executor.execute(chosen["actionId"])
	if ok:
		_track_and_overlogic(chosen)
		_emit_label(chosen, _format_label(chosen))
	else:
		# Action failed (e.g. interrupt with no casting target slipped through) -> default
		executor.execute_default()
		_emit_label({}, "Idle: default behavior")

func _track_and_overlogic(rule: Dictionary) -> void:
	if tracker != null:
		tracker.record_action(rule["actionId"])
	# overlogic: fast rule switching
	if not recent_rule_ids.has(rule["id"]):
		recent_rule_ids.append(rule["id"])
		if recent_rule_ids.size() >= 3:
			ctx.overlogic.add_event("fast_switch", 8)

func _emit_label(rule: Dictionary, label: String) -> void:
	current_rule = rule
	current_logic_changed.emit(rule, label)

func _format_label(rule: Dictionary) -> String:
	var c: Dictionary = GameDatabase.get_condition(rule["conditionId"])
	var a: Dictionary = GameDatabase.get_action(rule["actionId"])
	var c_name: String = c.get("displayName", rule["conditionId"])
	var a_name: String = a.get("displayName", rule["actionId"])
	var v: Variant = rule["conditionValue"]
	var v_str: String = ""
	if v is float:
		if c.get("parameterType", "") == "percent":
			v_str = " %d%%" % int(v * 100)
		else:
			v_str = " %.1f" % v
	elif v is Array:
		v_str = " %s" % str(v)
	return "[P%d] IF %s%s THEN %s" % [int(rule["priority"]), c_name, v_str, a_name]

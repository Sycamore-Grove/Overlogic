# GameState.gd
# Singleton autoload. Holds the persistent run state (rules, stats, progress, unlocks).
extends Node

signal rules_changed
signal stats_changed
signal progress_changed

# ---- Run state ----
var current_battle_index: int = 0
var teach_node: int = 1            # teaching node unlocked (1..4)

# ---- Player robot stats (modified by passive rewards) ----
# Base values from DESIGN.md §7.1
var stats: Dictionary = {
	"max_hp": 100.0,
	"max_energy": 100.0,
	"energy_regen": 8.0,
	"move_speed": 4.0,
	"basic_dmg": 8.0,
	"basic_cd": 0.4,
	"dash_distance": 3.0,
	"dash_cd": 3.0,
	"shield_dur": 2.0,
	"shield_reduce": 0.70,
	"shield_cd": 8.0,
	"interrupt_cd": 5.0,
	"overdrive_cd": 15.0,
	"overdrive_dur": 5.0
}

# ---- Unlocks (reward-granted modules) ----
var unlocked_condition_ids: Array = []   # extra conditions from rewards
var unlocked_action_ids: Array = []      # extra actions from rewards

# ---- Rules ----
# Each rule: { id, conditionId, conditionValue, actionId, priority, enabled }
var rules: Array = []

# ---- Last battle result (for report) ----
var last_report: Dictionary = {}
var _rule_counter: int = 0

func _ready() -> void:
	reset_run()

func reset_run() -> void:
	current_battle_index = 0
	teach_node = 1
	_reset_stats()
	unlocked_condition_ids.clear()
	unlocked_action_ids.clear()
	_init_default_rules()
	last_report.clear()
	rules_changed.emit()
	stats_changed.emit()
	progress_changed.emit()

func _reset_stats() -> void:
	stats = {
		"max_hp": 100.0, "max_energy": 100.0, "energy_regen": 8.0,
		"move_speed": 4.0, "basic_dmg": 8.0, "basic_cd": 0.4,
		"dash_distance": 3.0, "dash_cd": 3.0,
		"shield_dur": 2.0, "shield_reduce": 0.70, "shield_cd": 8.0,
		"interrupt_cd": 5.0, "overdrive_cd": 15.0, "overdrive_dur": 5.0
	}

func _init_default_rules() -> void:
	rules.clear()
	# Default rules from DESIGN.md §5.3 + teaching auto-append (§10).
	# We add all rules whose modules are unlocked at teach_node=1 here;
	# teaching auto-append rules are added when teach_node advances (advance_teach_node).
	rules.append(_new_rule("hp_low", 0.30, "shield", 100))
	rules.append(_new_rule("enemy_nearby", 2.5, "dash_away", 70))
	rules.append(_new_rule("enemy_nearby", 8.0, "basic_attack", 10))
	_advance_teach_rules_to(1)

func _new_rule(cond_id: String, cond_val: Variant, act_id: String, prio: int) -> Dictionary:
	_rule_counter += 1
	return {
		"id": "rule_%d" % _rule_counter,
		"conditionId": cond_id,
		"conditionValue": cond_val,
		"actionId": act_id,
		"priority": prio,
		"enabled": true
	}

# Auto-append the teaching rule for a given teach node (if not present).
func _advance_teach_rules_to(node: int) -> void:
	if node >= 2 and not _has_rule("enemy_far", "dash_toward"):
		rules.append(_new_rule("enemy_far", 5.0, "dash_toward", 50))
	if node >= 3 and not _has_rule("enemy_casting", "interrupt_shot"):
		rules.append(_new_rule("enemy_casting", null, "interrupt_shot", 90))
	if node >= 4 and not _has_rule("energy_high", "overdrive"):
		rules.append(_new_rule("energy_high", 0.80, "overdrive", 60))
	rules_changed.emit()

func _has_rule(cond_id: String, act_id: String) -> bool:
	for r in rules:
		if r["conditionId"] == cond_id and r["actionId"] == act_id:
			return true
	return false

func advance_teach_node() -> void:
	if teach_node < 4:
		teach_node += 1
		_advance_teach_rules_to(teach_node)
		progress_changed.emit()

# Called when a battle is won. Apply reward, advance progress, possibly advance teach.
func on_battle_won(reward_id: String) -> void:
	# Empty reward_id is valid: used by GameManager for the final boss battle
	# (no reward screen, straight to victory). Only apply reward if one was chosen.
	if reward_id != "":
		var reward: Dictionary = GameDatabase.get_reward(reward_id)
		if reward.is_empty():
			push_error("GameState: unknown reward %s" % reward_id)
		else:
			_apply_reward(reward)
	# Advance teach node after battles 1,2,3 (teachUnlockAfter field on battle data).
	var battle: Dictionary = GameDatabase.get_battle(current_battle_index)
	var tua: Variant = battle.get("teachUnlockAfter", null)
	if tua is int:
		teach_node = clampi(tua, 1, 4)
		_advance_teach_rules_to(teach_node)
	current_battle_index += 1
	progress_changed.emit()

func _apply_reward(reward: Dictionary) -> void:
	match reward["rewardType"]:
		"passive":
			_apply_passive(reward["targetId"], reward["value"])
		"new_action":
			if not unlocked_action_ids.has(reward["targetId"]):
				unlocked_action_ids.append(reward["targetId"])
		"new_condition":
			if not unlocked_condition_ids.has(reward["targetId"]):
				unlocked_condition_ids.append(reward["targetId"])
	stats_changed.emit()
	rules_changed.emit()

func _apply_passive(target: String, value: Variant) -> void:
	match target:
		"max_hp":
			stats["max_hp"] = float(stats["max_hp"]) + float(value)
		"energy_regen":
			stats["energy_regen"] = float(stats["energy_regen"]) * float(value)
		"basic_dmg":
			stats["basic_dmg"] = float(stats["basic_dmg"]) * float(value)
		"dash_cd":
			stats["dash_cd"] = float(stats["dash_cd"]) * float(value)
		"shield_dur":
			stats["shield_dur"] = float(stats["shield_dur"]) + float(value)
		"overdrive_dur":
			stats["overdrive_dur"] = float(stats["overdrive_dur"]) + float(value)
		"interrupt_cd":
			stats["interrupt_cd"] = float(stats["interrupt_cd"]) * float(value)
		_:
			push_warning("GameState: unknown passive target %s" % target)

# ---- Rule editing API (used by LogicEditorUI) ----
func add_rule(cond_id: String, cond_val: Variant, act_id: String, prio: int) -> void:
	rules.append(_new_rule(cond_id, cond_val, act_id, prio))
	rules_changed.emit()

func remove_rule(rule_id: String) -> void:
	for i in range(rules.size()):
		if rules[i]["id"] == rule_id:
			rules.remove_at(i)
			break
	rules_changed.emit()

func set_rule_priority(rule_id: String, prio: int) -> void:
	for r in rules:
		if r["id"] == rule_id:
			r["priority"] = clampi(prio, 0, 100)
			break
	rules_changed.emit()

func set_rule_condition_value(rule_id: String, value: Variant) -> void:
	for r in rules:
		if r["id"] == rule_id:
			r["conditionValue"] = value
			break
	rules_changed.emit()

func set_rule_action(rule_id: String, act_id: String) -> void:
	for r in rules:
		if r["id"] == rule_id:
			r["actionId"] = act_id
			break
	rules_changed.emit()

func set_rule_condition(rule_id: String, cond_id: String) -> void:
	for r in rules:
		if r["id"] == rule_id:
			r["conditionId"] = cond_id
			# reset value to default for that condition
			var cd: Dictionary = GameDatabase.get_condition(cond_id)
			r["conditionValue"] = cd.get("defaultValue", null)
			break
	rules_changed.emit()

func set_rule_enabled(rule_id: String, en: bool) -> void:
	for r in rules:
		if r["id"] == rule_id:
			r["enabled"] = en
			break
	rules_changed.emit()

# Available modules for the editor at current teach node + unlocks.
func available_condition_ids() -> Array:
	var out: Array = GameDatabase.conditions_unlocked_by_teach(teach_node)
	for id in unlocked_condition_ids:
		if not out.has(id):
			out.append(id)
	return out

func available_action_ids() -> Array:
	var out: Array = GameDatabase.actions_unlocked_by_teach(teach_node)
	for id in unlocked_action_ids:
		if not out.has(id):
			out.append(id)
	return out

func is_demo_cleared() -> bool:
	return current_battle_index >= GameDatabase.get_battle_count()

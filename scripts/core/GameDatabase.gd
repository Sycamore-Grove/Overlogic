# GameDatabase.gd
# Singleton autoload. Loads all JSON data tables once and exposes typed access.
extends Node

var conditions: Dictionary = {}        # id -> ConditionData
var actions: Dictionary = {}            # id -> ActionData
var enemies: Dictionary = {}            # id -> EnemyData
var battles: Array = []                 # list of BattleData (order matters)
var rewards: Dictionary = {}            # id -> RewardData

func _ready() -> void:
	_load_all()

func _load_all() -> void:
	conditions = _load_dict("res://data/conditions.json", "conditions")
	actions = _load_dict("res://data/actions.json", "actions")
	enemies = _load_dict("res://data/enemies.json", "enemies")
	battles = _load_list("res://data/battles.json", "battles")
	rewards = _load_dict("res://data/rewards.json", "rewards")

func _read_json(path: String) -> Variant:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("GameDatabase: cannot open %s (err %d)" % [path, FileAccess.get_open_error()])
		return null
	var text: String = f.get_as_text()
	f.close()
	var parsed: Variant = JSON.parse_string(text)
	if parsed == null:
		push_error("GameDatabase: invalid JSON in %s" % path)
	return parsed

func _load_dict(path: String, key: String) -> Dictionary:
	var data: Variant = _read_json(path)
	if not data is Dictionary or not (data as Dictionary).has(key):
		push_error("GameDatabase: missing key '%s' in %s" % [key, path])
		return {}
	var arr: Array = (data as Dictionary)[key]
	var out: Dictionary = {}
	for entry in arr:
		if entry is Dictionary and entry.has("id"):
			out[entry["id"]] = entry
	return out

func _load_list(path: String, key: String) -> Array:
	var data: Variant = _read_json(path)
	if not data is Dictionary or not (data as Dictionary).has(key):
		push_error("GameDatabase: missing key '%s' in %s" % [key, path])
		return []
	return (data as Dictionary)[key]

func get_condition(id: String) -> Dictionary:
	return conditions.get(id, {})

func get_action(id: String) -> Dictionary:
	return actions.get(id, {})

func get_enemy(id: String) -> Dictionary:
	return enemies.get(id, {})

func get_battle(index: int) -> Dictionary:
	if index < 0 or index >= battles.size():
		return {}
	return battles[index]

func get_battle_count() -> int:
	return battles.size()

func get_reward(id: String) -> Dictionary:
	return rewards.get(id, {})

# Conditions unlocked by teaching node (1..N) — these are always available from start
# or after a given battle. Returns list of condition ids.
func conditions_unlocked_by_teach(teach_node: int) -> Array:
	var out: Array = []
	for id in conditions:
		var c: Dictionary = conditions[id]
		var tu: Variant = c.get("teachUnlock", null)
		if tu is int and tu <= teach_node:
			out.append(id)
	return out

func actions_unlocked_by_teach(teach_node: int) -> Array:
	var out: Array = []
	for id in actions:
		var a: Dictionary = actions[id]
		var tu: Variant = a.get("teachUnlock", null)
		if tu is int and tu <= teach_node:
			out.append(id)
	return out

# PostBattleReportBuilder.gd
# Deterministic report text from a tracker snapshot. RefCounted.
extends RefCounted

func build(report: Dictionary, available_action_ids: Array) -> Dictionary:
	var lines_damage: Array = []
	var sources: Array = report["damage_by_source"].keys()
	sources.sort_custom(func(a, b): return float(report["damage_by_source"][a]) > float(report["damage_by_source"][b]))
	for s in sources:
		var ed: Dictionary = GameDatabase.get_enemy(s)
		var display: String = ed.get("displayName", s) if ed.has("displayName") else s
		if display == "":
			display = s
		lines_damage.append("- Took %.0f dmg from %s" % [float(report["damage_by_source"][s]), display])
	if lines_damage.is_empty():
		lines_damage.append("- No damage taken")

	# Most used action
	var most_used: String = ""
	var most_used_count: int = 0
	for act in report["action_usage"].keys():
		if int(report["action_usage"][act]) > most_used_count:
			most_used_count = int(report["action_usage"][act])
			most_used = act
	var most_used_line: String = "- Most used action: %s (x%d)" % [GameDatabase.get_action(most_used).get("displayName", most_used) if most_used != "" else "none", most_used_count]

	# Never used actions
	var never_used: Array = []
	for act in available_action_ids:
		if not report["action_usage"].has(act) or int(report["action_usage"][act]) == 0:
			never_used.append(GameDatabase.get_action(act).get("displayName", act))
	var never_used_line: String = "- Never used: %s" % (", ".join(never_used) if never_used.size() > 0 else "none")

	# Shield
	var shield_line: String = "- Shield: never used"
	if report["shield_activated_at_hp"] >= 0.0:
		if report["shield_activated_at_hp"] < 0.15:
			shield_line = "- Shield used at %d%% HP (too late)" % int(report["shield_activated_at_hp"] * 100)
		else:
			shield_line = "- Shield used at %d%% HP" % int(report["shield_activated_at_hp"] * 100)

	# Energy overflow
	var energy_line: String = "- Energy overflowed for %.1fs total" % float(report["energy_overflow_time"])

	# Death state
	var death_line: String = "- Death: HP=%.0f, Energy=%.0f, nearby enemies=%d" % [float(report["death_hp"]), float(report["death_energy"]), int(report["death_nearby_enemy_count"])]

	# Suggestions (deterministic)
	var suggestions: Array = []
	if int(report["interrupt_misses"]) >= 2:
		suggestions.append("Add IF Enemy Casting THEN Interrupt Shot")
	if int(report["death_nearby_enemy_count"]) >= 3:
		suggestions.append("Add IF Surrounded THEN Dash Away")
	if report["shield_activated_at_hp"] < 0.0 or report["shield_activated_at_hp"] < 0.15:
		suggestions.append("Raise priority of defensive rules")
	if float(report["energy_overflow_time"]) > 5.0 and available_action_ids.has("overdrive"):
		suggestions.append("Add IF Energy High THEN Overdrive")
	if suggestions.is_empty():
		suggestions.append("Try increasing dash priority to keep distance")

	return {
		"damage_lines": lines_damage,
		"logic_lines": [most_used_line, never_used_line, shield_line, energy_line, death_line],
		"suggestions": suggestions
	}

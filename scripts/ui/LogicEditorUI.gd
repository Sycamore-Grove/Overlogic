# LogicEditorUI.gd
extends Control

var rules_container: VBoxContainer = null
var cond_list: VBoxContainer = null
var act_list: VBoxContainer = null
var stats_label: Label = null
var preview_label: Label = null
var stage_label: Label = null

func _ready() -> void:
	_build_ui()
	GameState.rules_changed.connect(_refresh)
	GameState.stats_changed.connect(_refresh_stats)
	GameState.progress_changed.connect(_refresh_header)
	_refresh()

func _build_ui() -> void:
	anchors_preset = Control.PRESET_FULL_RECT
	var bg: ColorRect = ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.05, 0.06, 0.10)
	add_child(bg)
	# Header
	var header: Panel = Panel.new()
	header.position = Vector2(0.0, 0.0)
	header.size = Vector2(1280.0, 50.0)
	add_child(header)
	stage_label = Label.new()
	stage_label.position = Vector2(10.0, 14.0)
	stage_label.size = Vector2(600.0, 24.0)
	stage_label.add_theme_color_override("font_color", Color(0.8, 0.95, 1.0))
	stage_label.add_theme_font_size_override("font", 18)
	header.add_child(stage_label)
	preview_label = Label.new()
	preview_label.position = Vector2(620.0, 14.0)
	preview_label.size = Vector2(650.0, 24.0)
	preview_label.add_theme_color_override("font_color", Color(0.85, 0.6, 0.6))
	header.add_child(preview_label)
	# Three columns
	var left: Panel = Panel.new()
	left.position = Vector2(10.0, 60.0)
	left.size = Vector2(240.0, 540.0)
	add_child(left)
	var left_title: Label = Label.new()
	left_title.text = "Available Conditions"
	left_title.position = Vector2(8.0, 4.0)
	left_title.add_theme_color_override("font_color", Color(0.6, 0.85, 1.0))
	left.add_child(left_title)
	var left_scroll: ScrollContainer = ScrollContainer.new()
	left_scroll.position = Vector2(4.0, 30.0)
	left_scroll.size = Vector2(232.0, 500.0)
	left.add_child(left_scroll)
	cond_list = VBoxContainer.new()
	cond_list.size = Vector2(220.0, 0.0)
	left_scroll.add_child(cond_list)
	var mid: Panel = Panel.new()
	mid.position = Vector2(260.0, 60.0)
	mid.size = Vector2(760.0, 540.0)
	add_child(mid)
	var mid_title: Label = Label.new()
	mid_title.text = "Active Rules"
	mid_title.position = Vector2(8.0, 4.0)
	mid_title.add_theme_color_override("font_color", Color(0.6, 0.85, 1.0))
	mid.add_child(mid_title)
	var mid_scroll: ScrollContainer = ScrollContainer.new()
	mid_scroll.position = Vector2(4.0, 30.0)
	mid_scroll.size = Vector2(752.0, 470.0)
	mid.add_child(mid_scroll)
	rules_container = VBoxContainer.new()
	rules_container.size = Vector2(740.0, 0.0)
	rules_container.add_theme_constant_override("separation", 4)
	mid_scroll.add_child(rules_container)
	var add_btn: Button = Button.new()
	add_btn.text = "Add Rule"
	add_btn.position = Vector2(4.0, 505.0)
	add_btn.size = Vector2(120.0, 30.0)
	add_btn.pressed.connect(_on_add_rule)
	mid.add_child(add_btn)
	var run_btn: Button = Button.new()
	run_btn.text = "Run Simulation"
	run_btn.position = Vector2(620.0, 505.0)
	run_btn.size = Vector2(130.0, 30.0)
	run_btn.add_theme_font_size_override("font", 16)
	run_btn.pressed.connect(_on_run)
	mid.add_child(run_btn)
	var right: Panel = Panel.new()
	right.position = Vector2(1030.0, 60.0)
	right.size = Vector2(240.0, 540.0)
	add_child(right)
	var right_title: Label = Label.new()
	right_title.text = "Available Actions"
	right_title.position = Vector2(8.0, 4.0)
	right_title.add_theme_color_override("font_color", Color(0.6, 0.85, 1.0))
	right.add_child(right_title)
	var right_scroll: ScrollContainer = ScrollContainer.new()
	right_scroll.position = Vector2(4.0, 30.0)
	right_scroll.size = Vector2(232.0, 500.0)
	right.add_child(right_scroll)
	act_list = VBoxContainer.new()
	act_list.size = Vector2(220.0, 0.0)
	right_scroll.add_child(act_list)
	# Bottom stats
	var bottom: Panel = Panel.new()
	bottom.position = Vector2(0.0, 610.0)
	bottom.size = Vector2(1280.0, 110.0)
	add_child(bottom)
	stats_label = Label.new()
	stats_label.position = Vector2(10.0, 8.0)
	stats_label.size = Vector2(1260.0, 90.0)
	stats_label.add_theme_color_override("font_color", Color(0.7, 0.85, 1.0))
	bottom.add_child(stats_label)

func _refresh_header() -> void:
	var battle: Dictionary = GameDatabase.get_battle(GameState.current_battle_index)
	stage_label.text = "Battle %d/%d: %s  (Teach Node %d)" % [GameState.current_battle_index + 1, GameDatabase.get_battle_count(), battle.get("displayName", "?"), GameState.teach_node]
	var spawns: Array = battle.get("enemySpawns", [])
	var parts: Array = []
	for s in spawns:
		var eid: String = s["enemyId"]
		var ed: Dictionary = GameDatabase.get_enemy(eid)
		parts.append("%d x %s" % [int(s["count"]), ed.get("displayName", eid)])
	# Show newly unlocked modules for current teach node (teaching transparency)
	var unlocks: Array = []
	for cid in GameState.available_condition_ids():
		var cd: Dictionary = GameDatabase.get_condition(cid)
		if int(cd.get("teachUnlock", 0)) == GameState.teach_node:
			unlocks.append("COND:" + cd.get("displayName", cid))
	for aid in GameState.available_action_ids():
		var ad: Dictionary = GameDatabase.get_action(aid)
		if int(ad.get("teachUnlock", 0)) == GameState.teach_node:
			unlocks.append("ACTION:" + ad.get("displayName", aid))
	# Also show reward-granted unlocks
	for uid in GameState.unlocked_condition_ids:
		unlocks.append("COND:" + GameDatabase.get_condition(uid).get("displayName", uid))
	for uid in GameState.unlocked_action_ids:
		unlocks.append("ACTION:" + GameDatabase.get_action(uid).get("displayName", uid))
	var unlock_str: String = "  |  Unlocked: " + (", ".join(unlocks) if not unlocks.is_empty() else "none")
	preview_label.text = "Enemies: " + ", ".join(parts) + unlock_str

func _refresh_stats() -> void:
	var s: Dictionary = GameState.stats
	stats_label.text = "Unit Stats:  HP %.0f  Energy %.0f  Regen %.1f/s  Speed %.1f  BasicDmg %.1f  DashCD %.1fs  ShieldCD %.1fs  InterruptCD %.1fs  OverdriveCD %.1fs" % [float(s["max_hp"]), float(s["max_energy"]), float(s["energy_regen"]), float(s["move_speed"]), float(s["basic_dmg"]), float(s["dash_cd"]), float(s["shield_cd"]), float(s["interrupt_cd"]), float(s["overdrive_cd"])]

func _refresh() -> void:
	_refresh_header()
	_refresh_stats()
	for c in cond_list.get_children():
		c.queue_free()
	for c in act_list.get_children():
		c.queue_free()
	for c in rules_container.get_children():
		c.queue_free()
	# conditions
	for cid in GameState.available_condition_ids():
		var cd: Dictionary = GameDatabase.get_condition(cid)
		var lbl: Label = Label.new()
		var param: String = ""
		if cd.get("parameterType", "none") != "none":
			param = " (%s=%s)" % [cd.get("parameterType"), str(cd.get("defaultValue"))]
		lbl.text = "• %s%s" % [cd.get("displayName", cid), param]
		lbl.add_theme_color_override("font_color", Color(0.75, 0.9, 1.0))
		cond_list.add_child(lbl)
	# actions
	for aid in GameState.available_action_ids():
		var ad: Dictionary = GameDatabase.get_action(aid)
		var lbl: Label = Label.new()
		lbl.text = "• %s\n   cd %.1fs  e %.0f  r %.1f" % [ad.get("displayName", aid), float(ad.get("cooldown", 0)), float(ad.get("energyCost", 0)), float(ad.get("range", 0))]
		lbl.add_theme_color_override("font_color", Color(0.85, 0.95, 1.0))
		act_list.add_child(lbl)
	# rules
	for r in GameState.rules:
		_build_rule_row(r)

func _build_rule_row(rule: Dictionary) -> void:
	var row: HBoxContainer = HBoxContainer.new()
	row.add_theme_constant_override("separation", 4)
	# enabled toggle
	var tog: CheckBox = CheckBox.new()
	tog.button_pressed = bool(rule["enabled"])
	tog.toggled.connect(func(p): GameState.set_rule_enabled(rule["id"], p))
	row.add_child(tog)
	# priority spin
	var prio: SpinBox = SpinBox.new()
	prio.min_value = 0
	prio.max_value = 100
	prio.value = int(rule["priority"])
	prio.suffix = " P"
	prio.custom_minimum_size = Vector2(70.0, 24.0)
	prio.value_changed.connect(func(_v): GameState.set_rule_priority(rule["id"], int(prio.value)))
	row.add_child(prio)
	var iflbl: Label = Label.new()
	iflbl.text = "IF"
	iflbl.add_theme_color_override("font_color", Color(0.6, 0.8, 1.0))
	row.add_child(iflbl)
	# condition dropdown
	var cond_opt: OptionButton = OptionButton.new()
	var avail_c: Array = GameState.available_condition_ids()
	var sel_idx: int = 0
	for i in range(avail_c.size()):
		cond_opt.add_item(GameDatabase.get_condition(avail_c[i]).get("displayName", avail_c[i]), i)
		if avail_c[i] == rule["conditionId"]:
			sel_idx = i
	cond_opt.select(sel_idx)
	cond_opt.item_selected.connect(func(idx: int): GameState.set_rule_condition(rule["id"], avail_c[idx]))
	cond_opt.custom_minimum_size = Vector2(120.0, 24.0)
	row.add_child(cond_opt)
	# condition value editor (depends on type)
	var cd: Dictionary = GameDatabase.get_condition(rule["conditionId"])
	var ptype: String = cd.get("parameterType", "none")
	if ptype != "none":
		var val_edit: SpinBox = SpinBox.new()
		val_edit.custom_minimum_size = Vector2(80.0, 24.0)
		if ptype == "percent":
			val_edit.min_value = 5
			val_edit.max_value = 95
			val_edit.value = int(float(rule["conditionValue"]) * 100.0)
			val_edit.suffix = "%"
			val_edit.value_changed.connect(func(_v): GameState.set_rule_condition_value(rule["id"], float(val_edit.value) / 100.0))
		else:
			val_edit.min_value = int(cd.get("minValue", 1))
			val_edit.max_value = int(cd.get("maxValue", 20))
			val_edit.value = int(float(rule["conditionValue"]))
			val_edit.value_changed.connect(func(_v): GameState.set_rule_condition_value(rule["id"], float(val_edit.value)))
		row.add_child(val_edit)
	var thenlbl: Label = Label.new()
	thenlbl.text = "THEN"
	thenlbl.add_theme_color_override("font_color", Color(0.6, 0.8, 1.0))
	row.add_child(thenlbl)
	# action dropdown
	var act_opt: OptionButton = OptionButton.new()
	var avail_a: Array = GameState.available_action_ids()
	var sel_a: int = 0
	for i in range(avail_a.size()):
		act_opt.add_item(GameDatabase.get_action(avail_a[i]).get("displayName", avail_a[i]), i)
		if avail_a[i] == rule["actionId"]:
			sel_a = i
	act_opt.select(sel_a)
	act_opt.item_selected.connect(func(idx: int): GameState.set_rule_action(rule["id"], avail_a[idx]))
	act_opt.custom_minimum_size = Vector2(130.0, 24.0)
	row.add_child(act_opt)
	# delete
	var del_btn: Button = Button.new()
	del_btn.text = "X"
	del_btn.pressed.connect(func(): GameState.remove_rule(rule["id"]); AudioManager.play("button_click"))
	row.add_child(del_btn)
	rules_container.add_child(row)

func _on_add_rule() -> void:
	var avail_c: Array = GameState.available_condition_ids()
	var avail_a: Array = GameState.available_action_ids()
	if avail_c.is_empty() or avail_a.is_empty():
		return
	var cid: String = avail_c[0]
	var aid: String = avail_a[0]
	var cd: Dictionary = GameDatabase.get_condition(cid)
	GameState.add_rule(cid, cd.get("defaultValue", null), aid, 20)
	AudioManager.play("rule_add")

func _on_run() -> void:
	AudioManager.play("button_click")
	GameManager.go_combat()

# CombatArena.gd
# Top-level combat scene controller. Owns BattleContext, spawns robot + enemies,
# runs waves, updates HUD, detects win/lose, transitions via GameManager.
extends Node2D

const TICK_INTERVAL: float = 0.15

var ctx: RefCounted = null
var robot: CharacterBody2D = null
var brain: Node = null
var executor: Node = null
var stats: RefCounted = null
var tracker: RefCounted = null
var overlogic: RefCounted = null
var camera: Camera2D = null

var battle: Dictionary = {}
var wave_index: int = 0
var waves: Array = []
var wave_timer: float = 0.0
var wave_spawned: Array = []
var battle_ended: bool = false
var paused: bool = false
var time_speed: float = 1.0

# HUD nodes (set in _ready by code)
var hud_root: Control = null
var hp_bar: ProgressBar = null
var energy_bar: ProgressBar = null
var overlogic_bar: ProgressBar = null
var current_logic_label: Label = null
var wave_label: Label = null
var timer_label: Label = null
var boss_bar: ProgressBar = null
var cooldown_row: HBoxContainer = null
var pause_btn: Button = null
var speed_btn: Button = null
var phase_label: Label = null

var rule_display_timer: float = 0.0

func _ready() -> void:
	_init_battle()
	_build_arena()
	_spawn_robot()
	_build_hud()
	_start_waves()
	AudioManager.play("battle_start")

func _init_battle() -> void:
	battle = GameDatabase.get_battle(GameState.current_battle_index)
	ctx = preload("res://scripts/core/BattleContext.gd").new()
	tracker = preload("res://scripts/systems/CombatStatsTracker.gd").new()
	overlogic = preload("res://scripts/systems/OverlogicSystem.gd").new()
	ctx.tracker = tracker
	ctx.overlogic = overlogic
	ctx.time_speed = 1.0
	# group spawns by wave
	waves = []
	var spawns: Array = battle.get("enemySpawns", [])
	var by_wave: Dictionary = {}
	for s in spawns:
		var w: int = int(s["wave"])
		if not by_wave.has(w):
			by_wave[w] = []
		by_wave[w].append(s)
	var sorted_keys: Array = by_wave.keys()
	sorted_keys.sort()
	for k in sorted_keys:
		waves.append(by_wave[k])
	wave_index = 0
	wave_timer = 0.0
	battle_ended = false
	paused = false
	time_speed = 1.0

func _build_arena() -> void:
	# Floor
	var floor_rect: ColorRect = ColorRect.new()
	floor_rect.size = Vector2(800.0, 800.0)
	floor_rect.position = Vector2(-400.0, -400.0)
	floor_rect.color = Color(0.05, 0.07, 0.11)
	add_child(floor_rect)
	# Border
	var border: ColorRect = ColorRect.new()
	border.size = Vector2(800.0, 800.0)
	border.position = Vector2(-400.0, -400.0)
	border.color = Color(0.2, 0.5, 0.8, 0.25)
	# Use a slightly larger hollow effect via two rects
	var border2: ColorRect = ColorRect.new()
	border2.size = Vector2(810.0, 810.0)
	border2.position = Vector2(-405.0, -405.0)
	border2.color = Color(0.15, 0.35, 0.6, 0.5)
	add_child(border2)
	add_child(border)
	# grid lines
	for i in range(-10, 11):
		var v: Line2D = Line2D.new()
		v.add_point(Vector2(i * 40.0, -400.0))
		v.add_point(Vector2(i * 40.0, 400.0))
		v.default_color = Color(0.1, 0.18, 0.28, 0.4)
		v.width = 1.0
		add_child(v)
		var h: Line2D = Line2D.new()
		h.add_point(Vector2(-400.0, i * 40.0))
		h.add_point(Vector2(400.0, i * 40.0))
		h.default_color = Color(0.1, 0.18, 0.28, 0.4)
		h.width = 1.0
		add_child(h)
	# Camera
	camera = preload("res://scripts/core/ArenaCamera.gd").new()
	add_child(camera)

func _spawn_robot() -> void:
	robot = preload("res://scripts/robot/RobotController.gd").new()
	add_child(robot)
	robot.global_position = Vector2.ZERO
	stats = preload("res://scripts/robot/RobotStats.gd").new()
	stats.load_from_game_state()
	robot.init_from_stats(stats, ctx)
	ctx.robot = robot
	robot.died.connect(_on_robot_died)
	# Brain + executor
	executor = preload("res://scripts/logic/ActionExecutor.gd").new()
	add_child(executor)
	executor.setup(robot, ctx, stats, tracker)
	brain = preload("res://scripts/logic/LogicBrain.gd").new()
	add_child(brain)
	brain.setup(robot, ctx, executor, tracker)
	brain.speed_mul = 1.0
	brain.current_logic_changed.connect(_on_logic_changed)

func _start_waves() -> void:
	if waves.is_empty():
		return
	_spawn_wave(waves[0])

func _spawn_wave(wave_spawns: Array) -> void:
	for s in wave_spawns:
		var enemy_id: String = s["enemyId"]
		var count: int = int(s["count"])
		for i in range(count):
			_spawn_enemy(enemy_id, i)

func _spawn_enemy(enemy_id: String, idx: int) -> void:
	var data: Dictionary = GameDatabase.get_enemy(enemy_id)
	if data.is_empty():
		return
	var node: Node = null
	match data["behaviorType"]:
		"melee_chase":       node = preload("res://scripts/enemies/CrawlerEnemy.gd").new()
		"ranged_keep_distance": node = preload("res://scripts/enemies/ShooterEnemy.gd").new()
		"charge_caster":     node = preload("res://scripts/enemies/ChargerEnemy.gd").new()
		"boss_warden":       node = preload("res://scripts/enemies/BossProtocolWarden.gd").new()
		_:                   node = preload("res://scripts/enemies/CrawlerEnemy.gd").new()
	add_child(node)
	node.init(data, ctx)
	# spawn at arena edge ring
	var angle: float = (float(idx) / 6.0) * TAU + randf() * 0.5
	var radius: float = 8.5 if data["behaviorType"] != "boss_warden" else 0.0
	node.global_position = Vector2(cos(angle) * radius, sin(angle) * radius)
	node.global_position = ctx.clamp_to_arena(node.global_position)
	ctx.enemies.append(node)
	node.died.connect(_on_enemy_died)
	if data["behaviorType"] == "boss_warden":
		ctx.boss = node
		node.phase_changed.connect(_on_boss_phase_changed)
		if boss_bar != null:
			boss_bar.visible = true
	AudioManager.play("rule_add")

func _process(delta: float) -> void:
	if battle_ended:
		return
	if paused:
		return
	ctx.time_speed = time_speed
	tracker.tick(delta * time_speed)
	overlogic.tick(delta * time_speed, ctx.live_enemies() > 0)
	# casting tracking for interrupt miss (edge detection)
	var casting_now: bool = ctx.any_enemy_casting()
	if casting_now and not ctx.last_casting_state:
		ctx.tracker.record_casting_seen()
	ctx.last_casting_state = casting_now
	# wave progression
	if wave_index < waves.size() - 1 and ctx.live_enemies() == 0:
		# current wave cleared and there are more waves
		wave_timer += delta * time_speed
		if wave_timer >= 2.0:
			wave_timer = 0.0
			wave_index += 1
			_spawn_wave(waves[wave_index])
	# win check: all waves spawned and no live enemies
	if wave_index >= waves.size() - 1 and ctx.live_enemies() == 0 and not battle_ended:
		# but only if at least one enemy ever spawned (avoid instant win)
		if waves.size() > 0:
			_end_battle(true)
	# HUD updates
	_update_hud()
	rule_display_timer -= delta * time_speed

func _on_robot_died() -> void:
	if battle_ended:
		return
	tracker.snapshot_death(robot.hp, robot.energy, ctx.count_enemies_within(robot.global_position, 6.0))
	_end_battle(false)

func _on_enemy_died() -> void:
	# remove from ctx.enemies handled by queue_free; we just clean list
	ctx.enemies = ctx.enemies.filter(func(e): return is_instance_valid(e) and not e.is_dead())

func _on_boss_phase_changed(p: int) -> void:
	if phase_label != null:
		phase_label.text = "Protocol Warden: Phase %d" % p
		phase_label.visible = true
		get_tree().create_timer(2.0).timeout.connect(func():
			if phase_label != null:
				phase_label.visible = false
		)
	if camera != null:
		camera.shake(0.3, 8.0)

func _on_logic_changed(rule: Dictionary, label: String) -> void:
	if current_logic_label != null:
		var prefix: String = "Overlogic Active: " if overlogic.active else "Current Logic: "
		current_logic_label.text = prefix + label
		current_logic_label.modulate = Color(1.0, 0.95, 0.3) if overlogic.active else Color(0.8, 1.0, 1.0)
		rule_display_timer = 0.2

func _end_battle(won: bool) -> void:
	if battle_ended:
		return
	battle_ended = true
	GameState.last_report = tracker.to_report()
	if not won:
		AudioManager.play("defeat")
	else:
		AudioManager.play("victory")
	# small delay so player sees final frame
	await get_tree().create_timer(1.0).timeout
	GameManager.on_battle_finished(won)

func _build_hud() -> void:
	hud_root = Control.new()
	hud_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(hud_root)
	# top-left stats
	var vbox: VBoxContainer = VBoxContainer.new()
	vbox.position = Vector2(10.0, 10.0)
	vbox.size = Vector2(220.0, 100.0)
	hud_root.add_child(vbox)
	var hp_row: HBoxContainer = _row(vbox, "HP")
	hp_bar = _bar(hp_row, Color(0.2, 0.8, 0.3))
	var e_row: HBoxContainer = _row(vbox, "EN")
	energy_bar = _bar(e_row, Color(0.3, 0.7, 1.0))
	var ov_row: HBoxContainer = _row(vbox, "OL")
	overlogic_bar = _bar(ov_row, Color(0.9, 0.4, 1.0))

	# top-center wave + timer
	var top_center: VBoxContainer = VBoxContainer.new()
	top_center.position = Vector2(560.0, 10.0)
	top_center.size = Vector2(160.0, 60.0)
	hud_root.add_child(top_center)
	wave_label = Label.new()
	wave_label.text = "Wave 1/%d" % waves.size()
	wave_label.add_theme_color_override("font_color", Color(0.8, 0.9, 1.0))
	top_center.add_child(wave_label)
	timer_label = Label.new()
	timer_label.text = "0.0s"
	timer_label.add_theme_color_override("font_color", Color(0.7, 0.8, 0.9))
	top_center.add_child(timer_label)

	# boss bar top
	boss_bar = ProgressBar.new()
	boss_bar.position = Vector2(290.0, 10.0)
	boss_bar.size = Vector2(700.0, 16.0)
	boss_bar.max_value = 100.0
	boss_bar.value = 100.0
	boss_bar.visible = false
	hud_root.add_child(boss_bar)

	phase_label = Label.new()
	phase_label.position = Vector2(290.0, 30.0)
	phase_label.size = Vector2(700.0, 24.0)
	phase_label.add_theme_color_override("font_color", Color(1.0, 0.5, 0.5))
	phase_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	phase_label.visible = false
	hud_root.add_child(phase_label)

	# current logic center-bottom
	current_logic_label = Label.new()
	current_logic_label.position = Vector2(200.0, 660.0)
	current_logic_label.size = Vector2(880.0, 30.0)
	current_logic_label.add_theme_color_override("font_color", Color(0.8, 1.0, 1.0))
	current_logic_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	current_logic_label.text = "Current Logic: Idle"
	hud_root.add_child(current_logic_label)

	# cooldown row bottom-left
	cooldown_row = HBoxContainer.new()
	cooldown_row.position = Vector2(10.0, 640.0)
	cooldown_row.size = Vector2(600.0, 60.0)
	hud_root.add_child(cooldown_row)
	_build_cooldown_icons()

	# buttons bottom-right
	pause_btn = Button.new()
	pause_btn.text = "Pause"
	pause_btn.position = Vector2(1140.0, 640.0)
	pause_btn.size = Vector2(60.0, 30.0)
	pause_btn.pressed.connect(_on_pause)
	hud_root.add_child(pause_btn)
	speed_btn = Button.new()
	speed_btn.text = "Speed x1"
	speed_btn.position = Vector2(1210.0, 640.0)
	speed_btn.size = Vector2(60.0, 30.0)
	speed_btn.pressed.connect(_on_speed)
	hud_root.add_child(speed_btn)

func _row(parent: Node, label_text: String) -> HBoxContainer:
	var r: HBoxContainer = HBoxContainer.new()
	parent.add_child(r)
	var l: Label = Label.new()
	l.text = label_text
	l.custom_minimum_size = Vector2(24.0, 16.0)
	l.add_theme_color_override("font_color", Color(0.7, 0.85, 1.0))
	r.add_child(l)
	return r

func _bar(parent: Node, color: Color) -> ProgressBar:
	var b: ProgressBar = ProgressBar.new()
	b.custom_minimum_size = Vector2(180.0, 16.0)
	b.max_value = 100.0
	b.value = 100.0
	b.modulate = color
	parent.add_child(b)
	return b

var cd_labels: Dictionary = {}

func _build_cooldown_icons() -> void:
	for act_id in GameState.available_action_ids():
		var lbl: Label = Label.new()
		var a: Dictionary = GameDatabase.get_action(act_id)
		lbl.text = "%s\nready" % a.get("displayName", act_id).substr(0, 6)
		lbl.custom_minimum_size = Vector2(70.0, 50.0)
		lbl.add_theme_color_override("font_color", Color(0.7, 0.85, 1.0))
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		cooldown_row.add_child(lbl)
		cd_labels[act_id] = lbl

func _update_hud() -> void:
	if hp_bar != null:
		hp_bar.value = clampf(robot.hp / robot.max_hp * 100.0, 0.0, 100.0)
	if energy_bar != null:
		energy_bar.value = clampf(robot.energy / robot.max_energy * 100.0, 0.0, 100.0)
	if overlogic_bar != null:
		overlogic_bar.value = clampf(overlogic.value, 0.0, 100.0)
	if timer_label != null:
		timer_label.text = "%.1fs" % float(tracker.battle_time)
	if wave_label != null:
		wave_label.text = "Wave %d/%d" % [wave_index + 1, waves.size()]
	if boss_bar != null and ctx.boss != null and is_instance_valid(ctx.boss) and not ctx.boss.is_dead():
		boss_bar.value = clampf(ctx.boss.hp / ctx.boss.max_hp * 100.0, 0.0, 100.0)
	# cooldowns
	for act_id in cd_labels.keys():
		var lbl: Label = cd_labels[act_id]
		if executor.is_on_cooldown(act_id):
			var frac: float = executor.cooldown_fraction(act_id)
			lbl.text = "%s\n%.1fs" % [GameDatabase.get_action(act_id).get("displayName", act_id).substr(0, 6), float(executor.cooldowns[act_id])]
			lbl.modulate = Color(0.5, 0.5, 0.5)
		else:
			lbl.text = "%s\nready" % GameDatabase.get_action(act_id).get("displayName", act_id).substr(0, 6)
			lbl.modulate = Color(0.8, 1.0, 0.8)

func _on_pause() -> void:
	paused = not paused
	pause_btn.text = "Resume" if paused else "Pause"
	AudioManager.play("button_click")

func _on_speed() -> void:
	if time_speed == 1.0:
		time_speed = 2.0
		speed_btn.text = "Speed x2"
	else:
		time_speed = 1.0
		speed_btn.text = "Speed x1"
	AudioManager.play("button_click")

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		_on_pause()
	elif event.is_action_pressed("speed_toggle"):
		_on_speed()

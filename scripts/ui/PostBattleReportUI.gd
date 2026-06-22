# PostBattleReportUI.gd
extends Control

func _ready() -> void:
	_build_ui()

func _build_ui() -> void:
	anchors_preset = Control.PRESET_FULL_RECT
	var bg: ColorRect = ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.08, 0.04, 0.05)
	add_child(bg)
	var title: Label = Label.new()
	title.text = "Simulation Failed"
	title.position = Vector2(0.0, 30.0)
	title.size = Vector2(1280.0, 50.0)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font", 40)
	title.add_theme_color_override("font_color", Color(1.0, 0.4, 0.4))
	add_child(title)
	var report: Dictionary = GameState.last_report
	var builder: RefCounted = preload("res://scripts/systems/PostBattleReportBuilder.gd").new()
	var built: Dictionary = builder.build(report, GameState.available_action_ids())
	# Damage section
	var y: float = 100.0
	var dmg_title: Label = Label.new()
	dmg_title.text = "Damage Report"
	dmg_title.position = Vector2(60.0, y)
	dmg_title.add_theme_color_override("font_color", Color(0.9, 0.6, 0.6))
	add_child(dmg_title)
	y += 28.0
	for line in built.damage_lines:
		var l: Label = Label.new()
		l.text = line
		l.position = Vector2(60.0, y)
		l.add_theme_color_override("font_color", Color(0.85, 0.75, 0.75))
		add_child(l)
		y += 22.0
	# Logic section
	y += 10.0
	var logic_title: Label = Label.new()
	logic_title.text = "Logic Report"
	logic_title.position = Vector2(60.0, y)
	logic_title.add_theme_color_override("font_color", Color(0.6, 0.8, 1.0))
	add_child(logic_title)
	y += 28.0
	for line in built.logic_lines:
		var l: Label = Label.new()
		l.text = line
		l.position = Vector2(60.0, y)
		l.add_theme_color_override("font_color", Color(0.75, 0.85, 1.0))
		add_child(l)
		y += 22.0
	# Suggestions
	y += 10.0
	var sug_title: Label = Label.new()
	sug_title.text = "Suggested Fix"
	sug_title.position = Vector2(60.0, y)
	sug_title.add_theme_color_override("font_color", Color(0.9, 0.85, 0.5))
	add_child(sug_title)
	y += 28.0
	for s in built.suggestions:
		var l: Label = Label.new()
		l.text = "- " + s
		l.position = Vector2(60.0, y)
		l.add_theme_color_override("font_color", Color(0.95, 0.9, 0.6))
		add_child(l)
		y += 22.0
	# Buttons
	var bw: float = 180.0
	var bx: float = 1280.0 / 2.0 - (3.0 * bw + 2.0 * 20.0) / 2.0
	var by: float = 640.0
	var retry: Button = Button.new()
	retry.text = "Retry Battle"
	retry.position = Vector2(bx, by)
	retry.size = Vector2(bw, 40.0)
	retry.pressed.connect(func(): AudioManager.play("button_click"); GameManager.on_report_retry_battle())
	add_child(retry)
	var edit: Button = Button.new()
	edit.text = "Edit Logic"
	edit.position = Vector2(bx + bw + 20.0, by)
	edit.size = Vector2(bw, 40.0)
	edit.pressed.connect(func(): AudioManager.play("button_click"); GameManager.on_report_edit_logic())
	add_child(edit)
	var restart: Button = Button.new()
	restart.text = "Restart Run"
	restart.position = Vector2(bx + 2.0 * (bw + 20.0), by)
	restart.size = Vector2(bw, 40.0)
	restart.pressed.connect(func(): AudioManager.play("button_click"); GameManager.on_report_restart_run())
	add_child(restart)

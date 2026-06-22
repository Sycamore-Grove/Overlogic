# MainMenu.gd
extends Control

func _ready() -> void:
	_build_ui()

func _build_ui() -> void:
	anchors_preset = Control.PRESET_FULL_RECT
	var bg: ColorRect = ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.04, 0.05, 0.09)
	add_child(bg)
	var title: Label = Label.new()
	title.text = "OVERLOGIC"
	title.position = Vector2(0.0, 140.0)
	title.size = Vector2(1280.0, 80.0)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font", 72)
	title.add_theme_color_override("font_color", Color(0.6, 0.9, 1.0))
	add_child(title)
	var sub: Label = Label.new()
	sub.text = "design the brain, not the body"
	sub.position = Vector2(0.0, 230.0)
	sub.size = Vector2(1280.0, 24.0)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.add_theme_color_override("font_color", Color(0.5, 0.7, 0.85))
	add_child(sub)
	var btns: Array = ["Start Simulation", "Settings", "Exit"]
	var y: float = 360.0
	for t in btns:
		var b: Button = Button.new()
		b.text = t
		b.position = Vector2(540.0, y)
		b.size = Vector2(200.0, 40.0)
		b.add_theme_font_size_override("font", 18)
		add_child(b)
		match t:
			"Start Simulation": b.pressed.connect(_on_start)
			"Settings": b.pressed.connect(_on_settings)
			"Exit": b.pressed.connect(_on_exit)
		y += 56.0
	var hint: Label = Label.new()
	hint.text = "v0.1 Vertical Slice"
	hint.position = Vector2(0.0, 680.0)
	hint.size = Vector2(1280.0, 20.0)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.add_theme_color_override("font_color", Color(0.4, 0.5, 0.6))
	add_child(hint)

func _on_start() -> void:
	AudioManager.play("button_click")
	GameState.reset_run()
	GameManager.go_logic_edit()

func _on_settings() -> void:
	AudioManager.play("button_click")
	AudioManager.enabled = not AudioManager.enabled

func _on_exit() -> void:
	get_tree().quit()

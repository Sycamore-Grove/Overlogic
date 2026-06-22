# VictoryUI.gd
extends Control

func _ready() -> void:
	_build_ui()
	AudioManager.play("victory")

func _build_ui() -> void:
	anchors_preset = Control.PRESET_FULL_RECT
	var bg: ColorRect = ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.04, 0.08, 0.06)
	add_child(bg)
	var title: Label = Label.new()
	title.text = "Simulation Complete"
	title.position = Vector2(0.0, 180.0)
	title.size = Vector2(1280.0, 60.0)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font", 56)
	title.add_theme_color_override("font_color", Color(0.7, 1.0, 0.8))
	add_child(title)
	var sub: Label = Label.new()
	sub.text = "Your Logic Survived"
	sub.position = Vector2(0.0, 260.0)
	sub.size = Vector2(1280.0, 30.0)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.add_theme_font_size_override("font", 24)
	sub.add_theme_color_override("font_color", Color(0.6, 0.9, 0.85))
	add_child(sub)
	var quote: Label = Label.new()
	quote.text = "The machine learned from you."
	quote.position = Vector2(0.0, 320.0)
	quote.size = Vector2(1280.0, 24.0)
	quote.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	quote.add_theme_color_override("font_color", Color(0.5, 0.7, 0.75))
	add_child(quote)
	var btn: Button = Button.new()
	btn.text = "Return to Menu"
	btn.position = Vector2(540.0, 420.0)
	btn.size = Vector2(200.0, 40.0)
	btn.add_theme_font_size_override("font", 18)
	btn.pressed.connect(func(): AudioManager.play("button_click"); GameManager.go_main_menu())
	add_child(btn)

# RewardUI.gd
extends Control

var options: Array = []
var option_buttons: Array = []

func _ready() -> void:
	_build_ui()
	_populate()

func _build_ui() -> void:
	anchors_preset = Control.PRESET_FULL_RECT
	var bg: ColorRect = ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.05, 0.07, 0.12)
	add_child(bg)
	var title: Label = Label.new()
	title.text = "Protocol Upgrade"
	title.position = Vector2(0.0, 60.0)
	title.size = Vector2(1280.0, 50.0)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font", 40)
	title.add_theme_color_override("font_color", Color(0.7, 1.0, 0.9))
	add_child(title)
	var sub: Label = Label.new()
	sub.text = "Choose One"
	sub.position = Vector2(0.0, 120.0)
	sub.size = Vector2(1280.0, 24.0)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.add_theme_color_override("font_color", Color(0.6, 0.8, 1.0))
	add_child(sub)

func _populate() -> void:
	var battle: Dictionary = GameDatabase.get_battle(GameState.current_battle_index)
	var rm: RefCounted = preload("res://scripts/systems/RewardManager.gd").new()
	options = rm.build_options(battle)
	for i in range(options.size()):
		var rid: String = options[i]
		var r: Dictionary = GameDatabase.get_reward(rid)
		var btn: Button = Button.new()
		btn.text = "%s\n[%s]\n%s" % [r.get("displayName", rid), r.get("rewardType", ""), _describe(r)]
		btn.position = Vector2(120.0 + i * 360.0, 220.0)
		btn.size = Vector2(340.0, 240.0)
		btn.add_theme_font_size_override("font", 18)
		btn.pressed.connect(func(): _on_pick(rid))
		add_child(btn)
		option_buttons.append(btn)

func _describe(r: Dictionary) -> String:
	match r["rewardType"]:
		"passive": return "Permanently strengthens your unit."
		"new_action": return "Unlocks a new action module you can use in rules."
		"new_condition": return "Unlocks a new condition module you can use in rules."
		_: return ""

func _on_pick(rid: String) -> void:
	AudioManager.play("button_click")
	GameManager.on_reward_chosen(rid)

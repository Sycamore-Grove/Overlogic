# GameManager.gd
# Singleton autoload. Top-level FSM: MainMenu / LogicEditing / Combat / RewardSelection
# / PostBattleReport / Victory. Uses SceneTree.change_scene_to_packed for transitions.
extends Node

enum State { MainMenu, LogicEditing, Combat, RewardSelection, PostBattleReport, Victory }

var state: int = State.MainMenu
var last_battle_won: bool = false

func _ready() -> void:
	state = State.MainMenu

func go_main_menu() -> void:
	state = State.MainMenu
	get_tree().change_scene_to_file("res://scenes/MainMenu.tscn")

func go_logic_edit() -> void:
	state = State.LogicEditing
	get_tree().change_scene_to_file("res://scenes/LogicEditor.tscn")

func go_combat() -> void:
	state = State.Combat
	get_tree().change_scene_to_file("res://scenes/CombatArena.tscn")

func go_reward_selection() -> void:
	state = State.RewardSelection
	get_tree().change_scene_to_file("res://scenes/RewardScreen.tscn")

func go_post_battle_report() -> void:
	state = State.PostBattleReport
	get_tree().change_scene_to_file("res://scenes/PostBattleReport.tscn")

func go_victory() -> void:
	state = State.Victory
	get_tree().change_scene_to_file("res://scenes/Victory.tscn")

# Called by CombatArena when a battle ends.
func on_battle_finished(won: bool) -> void:
	last_battle_won = won
	if won:
		# Final boss cleared?
		if GameState.current_battle_index >= GameDatabase.get_battle_count() - 1:
			# Apply a dummy no-op reward to advance progress, then go victory.
			GameState.on_battle_won("")
			go_victory()
		else:
			go_reward_selection()
	else:
		go_post_battle_report()

# Called by RewardScreen after player picks a reward.
func on_reward_chosen(reward_id: String) -> void:
	GameState.on_battle_won(reward_id)
	if GameState.is_demo_cleared():
		go_victory()
	else:
		go_logic_edit()

# Called by PostBattleReport buttons.
func on_report_retry_battle() -> void:
	go_combat()

func on_report_edit_logic() -> void:
	go_logic_edit()

func on_report_restart_run() -> void:
	GameState.reset_run()
	go_logic_edit()

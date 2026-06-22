# ArenaCamera.gd
extends Camera2D

var shake_timer: float = 0.0
var shake_amp: float = 0.0

func _ready() -> void:
	make_current()
	global_position = Vector2.ZERO
	enabled = true

func _physics_process(delta: float) -> void:
	if shake_timer > 0.0:
		shake_timer -= delta
		var off: Vector2 = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * shake_amp
		offset = off
	else:
		offset = offset.lerp(Vector2.ZERO, 0.2)

func shake(duration: float, amp: float) -> void:
	shake_timer = max(shake_timer, duration)
	shake_amp = max(shake_amp, amp)

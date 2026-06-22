# AudioManager.gd
# Singleton autoload. Procedural SFX via AudioStreamGenerator (beeps) so no asset files needed.
extends Node

var bus_index: int = 0
var players: Array = []
var enabled: bool = true
var _last_play_time: Dictionary = {}   # event -> seconds since last play (throttle)
const THROTTLE: float = 0.03            # min seconds between same-event plays

func _ready() -> void:
	bus_index = AudioServer.get_bus_index("Master")
	if bus_index < 0:
		# create master if missing
		pass

func _physics_process(delta: float) -> void:
	# decay throttle timers
	for k in _last_play_time.keys():
		_last_play_time[k] = float(_last_play_time[k]) - delta
		if float(_last_play_time[k]) <= 0.0:
			_last_play_time.erase(k)

# Lightweight: synthesize a short beep with given freq and duration.
func _play_tone(freq: float, duration: float, volume_db: float, type: int) -> void:
	if not enabled:
		return
	var sample_rate: int = 22050
	var n_samples: int = int(sample_rate * duration)
	var stream: AudioStreamWAV = AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.stereo = false
	var data: PackedByteArray = PackedByteArray()
	data.resize(n_samples * 2)
	for i in range(n_samples):
		var t: float = float(i) / float(sample_rate)
		var s: float = 0.0
		match type:
			0: s = sin(t * freq * TAU)
			1: s = signf(sin(t * freq * TAU))  # square
			2: s = fposmod(t * freq, 1.0) * 2.0 - 1.0  # saw
			_: s = sin(t * freq * TAU)
		# decay envelope
		var env: float = exp(-t * 6.0)
		var v: int = int(clampf(s * env, -1.0, 1.0) * 16000.0)
		# store little-endian int16
		data.encode_s16(i * 2, v)
	stream.data = data
	var p: AudioStreamPlayer = AudioStreamPlayer.new()
	p.stream = stream
	p.volume_db = volume_db
	add_child(p)
	p.finished.connect(p.queue_free)
	p.play()

func play(event: String) -> void:
	# Throttle: skip if same event played within THROTTLE seconds (prevents node spam during overdrive)
	if _last_play_time.has(event) and float(_last_play_time[event]) > 0.0:
		return
	_last_play_time[event] = THROTTLE
	match event:
		"button_click":    _play_tone(660.0, 0.05, -12.0, 0)
		"rule_add":        _play_tone(880.0, 0.08, -10.0, 0)
		"battle_start":    _play_tone(220.0, 0.3, -8.0, 2)
		"basic_attack":    _play_tone(440.0, 0.06, -14.0, 1)
		"shield_on":       _play_tone(330.0, 0.2, -10.0, 0)
		"dash":            _play_tone(1200.0, 0.08, -12.0, 2)
		"interrupt_success": _play_tone(1500.0, 0.12, -6.0, 0)
		"enemy_death":     _play_tone(200.0, 0.15, -10.0, 2)
		"boss_phase":      _play_tone(110.0, 0.5, -4.0, 2)
		"defeat":          _play_tone(80.0, 0.8, -6.0, 2)
		"victory":         _play_tone(660.0, 0.4, -6.0, 0)
		"mine_explosion":  _play_tone(150.0, 0.25, -8.0, 2)
		_: pass

# RewardManager.gd
# Builds 3 reward options for the just-won battle. RefCounted.
extends RefCounted

func build_options(battle: Dictionary) -> Array:
	var pool: Array = battle.get("rewardPool", [])
	# Filter out already-claimed
	var available: Array = []
	for rid in pool:
		var r: Dictionary = GameDatabase.get_reward(rid)
		if r.is_empty():
			continue
		if r["rewardType"] == "new_action" and GameState.unlocked_action_ids.has(r["targetId"]):
			continue
		if r["rewardType"] == "new_condition" and GameState.unlocked_condition_ids.has(r["targetId"]):
			continue
		available.append(rid)
	# Ensure at least 1 passive
	var has_passive: bool = false
	for rid in available:
		if GameDatabase.get_reward(rid)["rewardType"] == "passive":
			has_passive = true
			break
	if not has_passive:
		# add a fallback passive from full pool
		for rid in GameDatabase.rewards.keys():
			if GameDatabase.get_reward(rid)["rewardType"] == "passive" and not available.has(rid):
				available.append(rid)
				break
	# pick 3 (or fewer if pool smaller)
	available.shuffle()
	var count: int = min(3, available.size())
	var out: Array = []
	for i in range(count):
		out.append(available[i])
	return out

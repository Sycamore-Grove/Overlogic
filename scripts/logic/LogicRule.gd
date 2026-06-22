# LogicRule.gd
# Helper: stable sort by priority descending, ties broken by insertion order.
extends RefCounted

static func sort_desc(rules: Array) -> Array:
	# Stable sort: Godot's sort_custom is not guaranteed stable, so we tag with index.
	var tagged: Array = []
	for i in range(rules.size()):
		tagged.append({ "rule": rules[i], "idx": i })
	tagged.sort_custom(_cmp)
	var out: Array = []
	for t in tagged:
		out.append(t.rule)
	return out

static func _cmp(a: Dictionary, b: Dictionary) -> bool:
	var pr: int = int(a["rule"]["priority"])
	var qr: int = int(b["rule"]["priority"])
	if pr != qr:
		return pr > qr
	return a["idx"] < b["idx"]

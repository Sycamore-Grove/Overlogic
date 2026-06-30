# OVERLOGIC ── 🤖 Design the Brain, Not the Hands.

[![Tech](https://img.shields.io/badge/Tech-Vanilla%20JS%20%7C%20Canvas%202D-00d2ff?style=for-the-badge)](index.html)
[![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API-3eff9d?style=for-the-badge)](src/systems/AudioManager.js)
[![License](https://img.shields.io/badge/License-MIT-b55cff?style=for-the-badge)](LICENSE)

> **2D top-down auto-combat roguelike strategy game.** 
> You don't need high APM or fast reflexes. Your only task is: **Program the combat brain of your robot.**
> Write logic rules (`IF` condition `THEN` action `PRIORITY` priority), watch the auto-simulation, analyze failures, adjust one rule, and turn defeat into victory!

---

## 👾 Key Features

* 🧠 **Logic Rule Editor (FSM)**: Build a prioritized list of rules. Supports compound `AND`/`OR` conditions, custom parameters, and targeting weights (Nearest, Lowest HP, Casting, Boss).
* ⚙️ **System Configuration**: Real-time Master Volume slider, Mute toggle, and Camera Shake toggle (accessibility comfort) that persist across sessions.
* 💾 **Loadout Slots**: 3 local save slots with glowing visual confirmations and quick keyboard shortcuts (`Ctrl + S` to save, `Enter`/`Space` to simulate).
* 🏷️ **Cyberpunk Tooltips**: Hover over any condition, action, or map node to see interactive stats, description, and preview enemies before battle.
* 🔍 **Active Rules Filter**: Easily search and filter active rules by keyword, action, or priority in real-time.
* Roguelike Upgrades**: Pick passive chips (Reflective Plating, Nanite Repair, Superconductors, Emergency Recall) after each battle.
* 📊 **Deterministic Failure Reports**: Get visual breakdown charts of rule execution, damage sources, and automated logic suggestions on defeat.
* 🎨 **Procedural Audio & VFX**: All sound effects are synthesized dynamically via the **Web Audio API** (no static audio files). Graphics feature particle shockwaves, dynamic laser sights, and grid-based background circuit flows.

---

## 🚀 Quick Start

Since the game uses native ES6 modules, it must be run via a local web server (due to browser CORS policies on `fetch()`).

### Method A: Python (Recommended)
Run the following in the project root:
```bash
python -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Method B: Node.js
```bash
npx serve .
```

---

## 🧠 Decision Loop

The robot evaluates its logic queue every `0.15s` (1 Tick):

```
[Start Tick]
     │
     ▼
 Filter Active Rules ──> Skip on cooldown, insufficient energy, or no valid targets
     │
     ▼
 Evaluate Conditions ──> Find all rules where Condition 1 [AND/OR Condition 2] is true
     │
     ▼
 Execute & Highlight ──> Run the single highest-priority rule and flash it on the HUD
     │
     ▼
 [Fallback behavior] ──> If no rules are valid, slowly drift toward the nearest enemy
```

---

## 🛠️ Logic Modules

### 1. Conditions
* `enemy_nearby [distance]`: True if nearest enemy is within range.
* `enemy_far [distance]`: True if nearest enemy is further than range.
* `hp_low [percent]`: True if robot HP is below threshold.
* `hp_above [percent]`: True if robot HP is above threshold.
* `energy_high [percent]`: True if robot energy is above threshold.
* `enemy_casting`: True if any enemy is preparing an attack.
* `on_hazard`: True if standing on a plasma hazard tile.
* `surrounded [dist, count]`: True if multiple enemies are within distance.
* `enemy_hp_low [percent]`: True if target HP is below threshold.
* `boss_phase [phase]`: True if Boss is in specific phase (1-4).

### 2. Actions
* `basic_attack` (cd: 0.4s, cost: 0, range: 8m): Fires a plasma bolt.
* `dash_toward` (cd: 3.0s, cost: 10, range: 3m): Teleports forward with invulnerability.
* `dash_away` (cd: 3.0s, cost: 10, range: 3m): Teleports away from the target.
* `shield` (cd: 8.0s, cost: 25, range: 0m): Deploys a barrier reducing damage by 70% for 2s.
* `interrupt_shot` (cd: 5.0s, cost: 20, range: 8m): Fires an EMP bolt to disrupt casting enemies.
* `overdrive` (cd: 15.0s, cost: 40, range: 0m): Increases attack speed by 50% and speed by 25% for 5s.
* `repair` (cd: 12.0s, cost: 35, range: 0m): Heals 25 HP.
* `drop_mine` (cd: 6.0s, cost: 20, range: 0m): Deploys a proximity explosive.

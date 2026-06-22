# Overlogic

> 2D top-down auto-battle strategy roguelike. You don't control the robot — you **write its brain**.
> Edit logic rules (IF condition THEN action PRIORITY n), watch the robot fight automatically,
> lose, debug, change one rule, win.

**Tech**: pure HTML/JS/Canvas, ES6 modules, no build step, no frameworks.
**Demo**: 6 battles → Boss `Protocol Warden` (3 phases) → demo cleared.

## Run

Open via any local web server (fetch() needs http, not file://):

```bash
# Python
python -m http.server 8000
# then open http://localhost:8000

# OR Node
npx serve .
```

No assets to download — audio is synthesized via Web Audio API, visuals are Canvas 2D.

## How to play

1. **Logic Editor** — list rules on the left, available conditions/actions on the sides.
   Add/edit/delete rules, tune priority (0–100, higher = runs first) and condition params.
2. **Run Simulation** — robot auto-fights by your rules. You only watch / pause / speed x2.
3. **Win** → pick 1 of 3 rewards (passive upgrade / new module).
4. **Lose** → read the debug report (top damage source, most-used action, suggested fix),
   edit one rule, retry.

## Files

```
index.html / style.css        single-page UI, 7 screens
data/*.json                   conditions / actions / enemies / battles / rewards
src/
  core/      GameDatabase GameState GameManager BattleContext CombatArena
  logic/     LogicBrain LogicRule ConditionEvaluator ActionExecutor
  robot/     RobotController RobotStats
  enemies/   EnemyBase Crawler Shooter Charger BossProtocolWarden
  vfx/       Projectile Mine ParticleSystem
  render/    ArenaRenderer Camera
  systems/   AudioManager OverlogicSystem CombatStatsTracker PostBattleReportBuilder RewardManager
  ui/        MainMenu LogicEditorUI BattleHUD RewardUI PostBattleReportUI VictoryUI
  main.js    entry
DESIGN.md                    full design doc (truth source)
```

## Design doc

See `DESIGN.md` for the full spec: rule semantics, enemy behaviors, Boss phases,
reward pools, teaching unlocks, Overlogic value, balance principles, acceptance checklist.

## License

MIT.

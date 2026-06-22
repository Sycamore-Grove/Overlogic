@echo off
cd /d "C:\Users\24377\Desktop\Sycamore-Grove\Overlogic"
git add -A
git status --short
echo === committing ===
git commit -m "fix(round2): robot movement smoothness, brain speed sync, charger wall detect, boss death instant win, null guards, rule id stability

- RobotController: persist move_intent between ticks (was cleared every frame causing stutter)
- LogicBrain: use ctx.time_speed so x2 speed actually accelerates logic ticks
- ChargerEnemy: detect wall via actual moved distance instead of float equality
- CombatArena: Boss death triggers instant victory, clearing summoned minions
- BossProtocolWarden: summoned crawlers now connect died signal for ctx cleanup
- RobotController: null-guard ctx.tracker access in energy overflow + damage taken
- GameState: replace randi-based rule id with monotonic counter (no collisions)

Verified: Godot 4.7 headless parse-check + Battle 1 + Boss battle all EXIT_CODE=0.

Co-Authored-By: AtomCode (GLM-5.2) <noreply@atomgit.com>"
echo === pushing ===
git push origin main
echo === done ===
git log --oneline -2
del /q "%~f0"

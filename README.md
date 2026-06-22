# Overlogic

> **超逻辑** — 2D 俯视角自动战斗策略肉鸽。你不操控机器人，你设计它的大脑。

玩家通过编辑"逻辑指令"（IF 条件 THEN 动作 PRIORITY 优先级）设计机器人的战斗大脑，机器人按规则自动战斗。观察失败、调试逻辑、构筑芯片，击败越来越复杂的敌人。

爽感不来自手速，来自"我设计出来的 AI 变聪明了"。

---

## 状态

Vertical Slice Demo（v0.1）。可完整通关一次：6 场战斗 → Boss → 通关。

## 引擎

**Godot 4.3+**（GL Compatibility 渲染器，跨平台轻量）。

无需任何外部美术/音频资源 —— 所有视觉用代码生成的几何图形，音效用 `AudioStreamGenerator` 实时合成短音。后续替换素材只需往 `assets/` 放文件并改 `AudioManager` / 各 Controller 的视觉构造。

## 如何运行

1. 安装 Godot 4.3+：<https://godotengine.org/download>
2. 打开 Godot，Import → 选择本目录下的 `project.godot`
3. 按 **F5** 运行（主场景已设为 `scenes/MainMenu.tscn`）

无构建步骤、无依赖安装。

## 玩法循环

```
主菜单 → 逻辑编辑 → 战斗（自动）→ 胜？奖励3选1 → 逻辑编辑 → 战斗 …
                          ↓
                    败？失败复盘 → {重编辑|重打本场|重开整局}
                          ↓
                    Boss 胜 → 通关 → 主菜单
```

- 战斗中**不可**移动机器人、不可改逻辑，只能暂停 / 调速（x1/x2）。
- 机器人每 `0.15s` 检查一次规则，按优先级从高到低执行首个可用动作。
- 失败后显示调试报告：伤害来源、最常用动作、从未使用的技能、确定性建议。

## 核心系统

| 系统 | 文件 |
|------|------|
| 数据加载（JSON） | `scripts/core/GameDatabase.gd` + `data/*.json` |
| 局状态 / 规则 / 强化 | `scripts/core/GameState.gd` |
| 顶层 FSM | `scripts/core/GameManager.gd` |
| 战斗上下文 | `scripts/core/BattleContext.gd` |
| 逻辑大脑（Tick） | `scripts/logic/LogicBrain.gd` |
| 条件判定 | `scripts/logic/ConditionEvaluator.gd` |
| 动作执行 | `scripts/logic/ActionExecutor.gd` |
| 优先级排序 | `scripts/logic/LogicRule.gd` |
| 玩家机器人 | `scripts/robot/RobotController.gd` + `RobotStats.gd` |
| 敌人基类 | `scripts/enemies/EnemyBase.gd` |
| 三种敌人 | `CrawlerEnemy.gd` / `ShooterEnemy.gd` / `ChargerEnemy.gd` |
| Boss | `scripts/enemies/BossProtocolWarden.gd`（三阶段） |
| 子弹 / 地雷 | `scripts/vfx/Projectile.gd` / `Mine.gd` |
| 战斗场景 | `scripts/core/CombatArena.gd` + `scenes/CombatArena.tscn` |
| Overlogic 值 | `scripts/systems/OverlogicSystem.gd` |
| 战斗统计 | `scripts/systems/CombatStatsTracker.gd` |
| 复盘报告 | `scripts/systems/PostBattleReportBuilder.gd` |
| 奖励生成 | `scripts/systems/RewardManager.gd` |
| 音效 | `scripts/systems/AudioManager.gd` |
| UI | `scripts/ui/*.gd` + `scenes/*.tscn` |

## 数据表

所有数值数据化，位于 `data/`：

| 文件 | 内容 |
|------|------|
| `conditions.json` | 8 种条件模块（5 教学 + 3 奖励解锁） |
| `actions.json` | 8 种动作模块（6 教学 + 2 奖励解锁） |
| `enemies.json` | 3 普通敌人 + 1 Boss |
| `battles.json` | 6 场战斗（含敌人波次、奖励池、教学解锁节点） |
| `rewards.json` | 7 被动强化 + 2 新动作 + 3 新条件 |

改数值只需改 JSON，无需动代码。

## 教学解锁

| 节点 | 解锁条件 | 解锁内容 |
|------|----------|----------|
| 1 | 开局 | `enemy_nearby` `hp_low` + `basic_attack` `dash_away` `shield` |
| 2 | Battle 1 后 | `enemy_far` + `dash_toward` |
| 3 | Battle 2 后 | `enemy_casting` + `interrupt_shot` |
| 4 | Battle 3 后 | `energy_high` + `overdrive` |

## 6 场战斗

1. **Calibration** — 3×Crawler（教学攻击+后撤）
2. **Distance Test** — 2×Shooter + 2×Crawler（教学突进）
3. **Charge Warning** — 2×Charger + 2×Crawler（教学打断）
4. **Swarm** — 8×Crawler + 1×Shooter（教学包围逃脱）
5. **Mixed Protocol** — 3×Crawler + 2×Shooter + 2×Charger（综合）
6. **Protocol Warden** — Boss 三阶段（通关）

## Overlogic 值

战斗中累积，达 70 进入 `Overlogic Active`：攻击冷却 ×0.7、技能冷却 ×0.7、UI 视觉扰动。来源：快速切换规则、使用 Overdrive、打断 Boss、低血量反杀。每秒衰减。

## 项目结构

```
Overlogic/
  project.godot          # 引擎配置 + autoload 注册
  data/                  # JSON 数据表
  scenes/                # .tscn 场景（6 个）
  scripts/
    core/    GameDatabase GameState GameManager BattleContext CombatArena ArenaCamera
    logic/   LogicBrain ConditionEvaluator ActionExecutor LogicRule
    robot/   RobotController RobotStats
    enemies/ EnemyBase Crawler Shooter Charger Boss
    vfx/     Projectile Mine
    systems/ AudioManager OverlogicSystem CombatStatsTracker PostBattleReportBuilder RewardManager
    ui/      MainMenu LogicEditorUI RewardUI PostBattleReportUI VictoryUI
  DESIGN.md              # 完整设计文档（907 行）
  README.md              # 本文件
  LICENSE                # MIT
```

## 设计文档

完整设计（含数值表、状态机、验收 checklist、可扩展系统预留）见 [`DESIGN.md`](DESIGN.md)。

## 验收对照

- [x] 玩家可进入游戏
- [x] 玩家可编辑逻辑规则
- [x] 机器人按规则自动战斗
- [x] 修改规则明显影响战斗结果
- [x] ≥3 种普通敌人
- [x] ≥1 个 Boss（三阶段）
- [x] ≥6 场战斗
- [x] 战斗胜利后可选奖励
- [x] 失败后有复盘信息（含确定性建议）
- [x] 游戏可完整通关一次
- [x] 核心系统代码结构清晰、可扩展
- [x] 玩家不可直接控制机器人移动
- [x] 标题显示为 Overlogic
- [x] 战斗中显示 Current Logic
- [x] 11 类音效（实时合成）
- [x] 教学逐步解锁（4 节点）
- [x] Overlogic 值条显示，达阈值有效果

## 可扩展（Demo 未做，结构预留）

多机器人小队 / 规则链条 / 逻辑冲突系统（`Directive Conflict Detected`）/ AND-OR 条件组合 / 敌人弱点 / 无人机流派 / 日志回放 / 创意工坊 / 无限模式。`OverlogicValue` 字段与失控挂钩点已预留。

## 许可

MIT © Sycamore-Grove

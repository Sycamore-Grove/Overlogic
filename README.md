# OVERLOGIC ── 🤖 Design the Brain, Not the Hands.

[![Tech](https://img.shields.io/badge/Tech-Vanilla%20JS%20%7C%20Canvas%202D-00d2ff?style=for-the-badge)](index.html)
[![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API-3eff9d?style=for-the-badge)](src/systems/AudioManager.js)
[![License](https://img.shields.io/badge/License-MIT-b55cff?style=for-the-badge)](LICENSE)

> **2D 俯视角自动战斗策略 Roguelike 游戏。** 在这里，你不需要极限的操作和手速，你唯一需要做的是──**为你的机器人编写战斗大脑**。
> 
> 编写逻辑规则（`IF` 条件 `THEN` 动作 `PRIORITY` 优先级），观察机器人的自动战斗，分析失败原因，调整一条规则，然后反败为胜！

---

## 👾 游戏特色 | Key Features

* 🧠 **指令式策略大脑 (Logic FSM)**：通过可视化的规则编辑器，定制由多条优先级规则组成的 AI 树。支持 `AND` 双条件组合与多种寻敌权重（最近、血量最低、施法中、Boss）。
* ⚔️ **全自动拟真模拟 (Simulation)**：一键启动战斗，支持 `x0.5` / `x1` / `x2` / `x4` 调速及单帧步进（Step），随时暂停观察 AI 的每一次 Tick 决策。
* 💎 **肉鸽芯片构筑 (Roguelike Upgrades)**：通关关卡即可获得芯片升级。解锁全新的**条件模块**、**动作模块**，或配置**装甲强化**（如反射电弧、自愈纳米、超导回能、致命闪避等）。
* 📊 **确定性失败复盘 (Failure Debug Report)**：失败后自动生成深度诊断报告。包含最常触发动作统计、能量溢出时长、核心受损来源图表，并根据运行数据提供确定性的逻辑调整建议。
* 🎨 **高质感赛博视听 (Cyberpunk Aesthetics)**：
  * **视觉表现**：平滑的车体转向插值、动态变形弯曲的地面网格（受爆炸冲击波影响）、发光能量护盾、随目标移动的激光瞄准线。
  * **音频表现**：全部音效基于 **Web Audio API** 实时合成，无任何静态音频资源，低碳高效。

---

## 🚀 快速开始 | Quick Start

本游戏为**纯前端无构建步骤**项目，使用原生 ES6 模块。由于 `fetch()` 安全策略限制，不能直接双击 `index.html` 打开，需要通过本地 Web 服务器运行。

### 方法 A：Python (推荐)
在项目根目录下打开终端并运行：
```bash
python -m http.server 8000
```
然后在浏览器中打开 `http://localhost:8000`

### 方法 B：Node.js
```bash
npx serve .
```
然后在浏览器中打开控制台输出的地址。

---

## 🧠 核心决策机制 | How It Works

机器人每 `0.15s` 会进行一次逻辑 Tick 检查：

```
[开始 Tick]
     │
     ▼
 遍历所有启用规则 ──(过滤)──> 排除冷却中 / 能量不足 / 无效目标的规则
     │
     ▼
 评估剩余规则条件 ──(筛选)──> 收集所有 Condition 成立的规则
     │
     ▼
 排序并执行 ────────(决策)──> 选择 Priority 最高的一条规则执行，并高亮 HUD
     │
     ▼
 [无有效规则] ──────(兜底)──> 执行默认行为：向最近的敌人缓慢移动
```

---

## 🛠️ 逻辑模块概览 | Modules

### 1. 条件模块 (Conditions)
| ID | 模块名称 | 参数类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `enemy_nearby` | 敌人临近 | 距离 (m) | 最近敌人距离 $\le$ 设定值时成立 |
| `enemy_far` | 敌人远离 | 距离 (m) | 最近敌人距离 $\ge$ 设定值时成立 |
| `hp_low` | 自身低血 | 百分比 (%) | 自身生命值 $\le$ 设定比例时成立 |
| `energy_high` | 能量充沛 | 百分比 (%) | 自身能量值 $\ge$ 设定比例时成立 |
| `enemy_casting` | 敌人施法 | 无 | 场上有任意敌人正在蓄力/施法时成立 |
| `on_hazard` | 踩中危险区 | 无 | 机器人当前站在等离子伤害区内时成立 |
| `surrounded` | 四面楚歌 | 距离/数量 | 指定距离内的敌人数量 $\ge$ 设定值时成立 |
| `enemy_hp_low` | 目标残血 | 百分比 (%) | 最近敌人生命值 $\le$ 设定比例时成立 |
| `boss_phase` | 判定 Boss 阶段 | 整数 | Boss 处于指定阶段 (1-4) 时成立 |

### 2. 动作模块 (Actions)
| ID | 动作名称 | 冷却时间 | 能量消耗 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `basic_attack` | 基础攻击 | 0.4s | 0 | 向目标发射一发基础能量弹（超出射程时自动靠近） |
| `dash_toward` | 闪现突进 | 3.0s | 10 | 向目标方向瞬间突进 3m，期间获得无敌免伤 |
| `dash_away` | 闪现撤退 | 3.0s | 10 | 向远离目标的方向瞬间撤退 3m |
| `shield` | 能量护盾 | 8.0s | 25 | 展开护盾持续 2s，期间受到的伤害降低 70% |
| `interrupt_shot` | 打断射击 | 5.0s | 20 | 发射一发快速电磁弹，直接打断施法中的敌人并造成伤害 |
| `overdrive` | 核心超载 | 15.0s | 40 | 5s内攻速提高50%、移速提高25%，期间能量不再自然恢复 |
| `repair` | 应急修复 | 12.0s | 35 | 立即修复自身并恢复 25 点生命值 |
| `drop_mine` | 投放地雷 | 6.0s | 20 | 在原地留下一颗地雷，敌人靠近时爆炸造成范围伤害 |

---

## 📈 最近更新与深度优化 | Recent Optimizations

1. 🐛 **关卡逻辑修复**：重构了升级节点的关卡推进状态机，彻底修复了玩家在 `Upgrade Vault` 节点选择奖励后会触发双倍推进、从而跳过终极 Boss 直达通关画面的严重 Bug。
2. 🦿 **运动平滑与转向插值**：机器人车体转向引入了基于 $\Delta t$ 的角度插值（Lerp），消除了此前瞬间转向的视觉突兀感，移动表现更为平滑自然。
3. ⚡ **反射装甲视觉电弧**：当携带 `reflective_plating` 芯片的机器人在护盾期间受到攻击时，会在机器人与受击敌人之间瞬间绘制一条闪烁的**蓝色能量电弧**，并伴随局部火花散逸。
4. 🛰️ **动态瞄准红外线**：为机器人的瞄准虚线添加了动态偏移，激光虚线点会不断向锁定的目标方向快速滚动，极具科技感。
5. 🛡️ **AI 漂移修正**：修正了机器人在执行无位移指令（如开盾、修复、超载）时会沿着上一时刻速度惯性漂移的物理缺陷。现在决策器会在 Tick 开始时重置默认追击意图。
6. 🎯 **Retina 高清图表**：对战后诊断面板中的 Canvas 数据图表进行了 High-DPI 适配，自动根据设备的 `devicePixelRatio` 缩放画布，确保在高分屏上文字 and 条形图清晰锐利。
7. ⚠️ **悬浮诊断气泡**：逻辑编辑器的警告图标（⚠️）由默认的 HTML Title 悬浮窗升级为定制的、无延迟弹出的赛博风格悬浮框。

---

## 📂 项目结构 | Project Structure

```
Overlogic/
├── data/                       # 核心数据配置文件
│   ├── actions.json            # 动作模块属性 (能耗、冷却、解锁条件)
│   ├── conditions.json         # 条件模块参数及类型定义
│   ├── enemies.json            # 普通怪物与 Boss 属性
│   ├── battles.json            # 关卡波次及奖励池配置
│   └── rewards.json            # 局外芯片和属性强化列表
├── src/
│   ├── core/                   # 游戏主控制及存档状态
│   │   ├── GameManager.js      # 状态机控制器 (菜单/编辑/战斗/结算)
│   │   ├── GameState.js        # 局内存档、构筑、属性计算、撤销/重做栈
│   │   └── CombatArena.js      # 物理碰撞、波次刷新、弹幕更新主循环
│   ├── logic/                  # AI 决策大脑
│   │   ├── LogicBrain.js       # AI Tick 主决策器
│   │   ├── ConditionEvaluator.js # 条件评估解析器
│   │   └── ActionExecutor.js   # 动作执行分发器
│   ├── enemies/                # 敌人行为状态机 (Crawler, Shooter, Charger, Boss)
│   ├── robot/                  # 玩家机器人实体控制与属性计算
│   ├── render/                 # 游戏画面与摄像机抖动渲染器
│   ├── systems/                # 音频合成、战后诊断报告生成、关卡奖励池管理
│   └── ui/                     # 各大屏幕 of DOM UI 绑定与自定义 Canvas 图表
├── index.html                  # 单页面 HTML 入口
├── style.css                   # 赛博朋克主题样式与霓虹滤镜
└── DESIGN.md                   # 详细的工程与数值设计白皮书
```

---

## 📄 开源协议 | License

本项目基于 [MIT](LICENSE) 协议开源。

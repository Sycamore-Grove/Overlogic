// GameState.js — persistent run state: rules, stats, progress, unlocks.
// Mirrors scripts/core/GameState.gd. Singleton instance exported.

import { GameDatabase } from './GameDatabase.js';

// Base stats from DESIGN.md §7.1
// Base stats from DESIGN.md §7.1 + Round 11 Custom Upgrades
function baseStats() {
  return {
    max_hp: 100, max_energy: 100, energy_regen: 8,
    move_speed: 4, basic_dmg: 8, basic_cd: 0.4,
    dash_distance: 3, dash_cd: 3,
    shield_dur: 2, shield_reduce: 0.70, shield_cd: 8,
    interrupt_cd: 5, overdrive_cd: 15, overdrive_dur: 5,
    reflective_plating: 0, nanite_repair: 0, superconductors: 0,
    emergency_recall: 0, heavy_impact: 0, thermal_recycle: 0,
    armor_piercing: 0,
  };
}

class GameStateClass {
  constructor() {
    this.currentBattleIndex = 0;
    this.currentMapColumn = 0;
    this.selectedNodeId = '0_start';
    this.mapNodes = [];
    this.onUpgradeNodeTriggered = null;
    this.teachNode = 1;
    this.stats = baseStats();
    this.unlockedConditionIds = [];   // extra conditions from rewards
    this.unlockedActionIds = [];      // extra actions from rewards
    this.rules = [];
    this._undoStack = [];
    this._redoStack = [];
    this.lastReport = {};
    this._ruleCounter = 0;
    // simple pub/sub for UI re-render
    this._listeners = { rules: [], stats: [], progress: [] };
    if (!this.loadFromStorage()) {
      this.resetRun();
    }
  }

  on(evt, fn) { this._listeners[evt].push(fn); }
  _emit(evt) { for (const fn of this._listeners[evt]) fn(); }

  resetRun() {
    this.currentBattleIndex = 0;
    this.currentMapColumn = 0;
    this.selectedNodeId = '0_start';
    this._initMap();
    this.teachNode = 1;
    this.stats = baseStats();
    this.unlockedConditionIds = [];
    this.unlockedActionIds = [];
    this.lastReport = {};
    this._initDefaultRules();
    this.saveToStorage();
    this._emit('rules'); this._emit('stats'); this._emit('progress');
  }

  _newRule(condId, condVal, actId, prio, condId2 = null, condVal2 = null, operator = null, targetPriority = 'nearest') {
    this._ruleCounter += 1;
    return {
      id: `rule_${this._ruleCounter}`,
      conditionId: condId,
      conditionValue: condVal,
      conditionId2: condId2,
      conditionValue2: condVal2,
      operator: operator,
      actionId: actId,
      priority: prio,
      targetPriority: targetPriority,
      enabled: true,
    };
  }

  _initDefaultRules() {
    this.rules = [];
    // DESIGN.md §5.3 default rules
    this.rules.push(this._newRule('hp_low', 0.30, 'shield', 100));
    this.rules.push(this._newRule('enemy_nearby', 2.5, 'dash_away', 70));
    this.rules.push(this._newRule('enemy_nearby', 8.0, 'basic_attack', 10));
    this._advanceTeachRulesTo(1);
  }

  _hasRule(condId, actId) {
    return this.rules.some(r => r.conditionId === condId && r.actionId === actId);
  }

  _advanceTeachRulesTo(node) {
    if (node >= 2 && !this._hasRule('enemy_far', 'dash_toward'))
      this.rules.push(this._newRule('enemy_far', 5.0, 'dash_toward', 50));
    if (node >= 3 && !this._hasRule('enemy_casting', 'interrupt_shot'))
      this.rules.push(this._newRule('enemy_casting', null, 'interrupt_shot', 90));
    if (node >= 4 && !this._hasRule('energy_high', 'overdrive'))
      this.rules.push(this._newRule('energy_high', 0.80, 'overdrive', 60));
    this.saveToStorage();
    this._emit('rules');
  }

  advanceTeachNode() {
    if (this.teachNode < 4) {
      this.teachNode += 1;
      this._advanceTeachRulesTo(this.teachNode);
      this._emit('progress');
    }
  }

  // Called when a battle is won. reward_id may be '' for final boss skip.
  onBattleWon(rewardId) {
    if (rewardId !== '') {
      const reward = GameDatabase.getReward(rewardId);
      if (reward) this._applyReward(reward);
      else console.error('GameState: unknown reward', rewardId);
    }

    const colNodes = this.mapNodes[this.currentMapColumn];
    if (colNodes) {
      const node = colNodes.find(n => n.id === this.selectedNodeId);
      if (node) {
        node.completed = true;
        if (node.type === 'combat') {
          this.currentBattleIndex = node.battleIndex;
        }
      }
    }

    const battle = GameDatabase.getBattle(this.currentBattleIndex);
    const tua = battle && battle.teachUnlockAfter;
    if (typeof tua === 'number') {
      this.teachNode = Math.max(1, Math.min(4, tua));
      this._advanceTeachRulesTo(this.teachNode);
    }

    this.currentMapColumn += 1;
    if (this.currentMapColumn < this.mapNodes.length) {
      const nextCol = this.mapNodes[this.currentMapColumn];
      this.selectedNodeId = nextCol[0].id;
    }

    this.saveToStorage();
    this._emit('progress');
  }

  // Called when an upgrade node reward is chosen.
  onUpgradeNodeChosen(rewardId) {
    if (rewardId !== '') {
      const reward = GameDatabase.getReward(rewardId);
      if (reward) this._applyReward(reward);
      else console.error('GameState: unknown reward', rewardId);
    }
    this.saveToStorage();
    this._emit('progress');
  }

  _applyReward(reward) {
    switch (reward.rewardType) {
      case 'passive': this._applyPassive(reward.targetId, reward.value); break;
      case 'new_action':
        if (!this.unlockedActionIds.includes(reward.targetId))
          this.unlockedActionIds.push(reward.targetId);
        break;
      case 'new_condition':
        if (!this.unlockedConditionIds.includes(reward.targetId))
          this.unlockedConditionIds.push(reward.targetId);
        break;
    }
    this._emit('stats'); this._emit('rules');
  }

  _applyPassive(target, value) {
    switch (target) {
      case 'max_hp':        this.stats.max_hp += value; break;
      case 'energy_regen':  this.stats.energy_regen *= value; break;
      case 'basic_dmg':     this.stats.basic_dmg *= value; break;
      case 'dash_cd':       this.stats.dash_cd *= value; break;
      case 'shield_dur':    this.stats.shield_dur += value; break;
      case 'overdrive_dur': this.stats.overdrive_dur += value; break;
      case 'interrupt_cd':  this.stats.interrupt_cd *= value; break;
      case 'reflective_plating': this.stats.reflective_plating += value; break;
      case 'nanite_repair':      this.stats.nanite_repair += value; break;
      case 'superconductors':    this.stats.superconductors += value; break;
      case 'emergency_recall':   this.stats.emergency_recall += value; break;
      case 'heavy_impact':       this.stats.heavy_impact += value; break;
      case 'thermal_recycle':    this.stats.thermal_recycle += value; break;
      case 'armor_piercing':     this.stats.armor_piercing += value; break;
      default: console.warn('GameState: unknown passive target', target);
    }
  }

  // ---- Rule editing API (used by LogicEditorUI) ----
  _pushState() {
    this._undoStack = this._undoStack || [];
    this._redoStack = this._redoStack || [];
    if (this._undoStack.length >= 50) this._undoStack.shift();
    this._undoStack.push(JSON.stringify(this.rules));
    this._redoStack = [];
  }
  pushUndoState() {
    this._pushState();
  }
  undo() {
    this._undoStack = this._undoStack || [];
    this._redoStack = this._redoStack || [];
    if (this._undoStack.length === 0) return false;
    this._redoStack.push(JSON.stringify(this.rules));
    const raw = this._undoStack.pop();
    this.rules = JSON.parse(raw);
    this.saveToStorage();
    this._emit('rules');
    return true;
  }
  redo() {
    this._undoStack = this._undoStack || [];
    this._redoStack = this._redoStack || [];
    if (this._redoStack.length === 0) return false;
    this._undoStack.push(JSON.stringify(this.rules));
    const raw = this._redoStack.pop();
    this.rules = JSON.parse(raw);
    this.saveToStorage();
    this._emit('rules');
    return true;
  }

  addRule(condId, condVal, actId, prio, condId2 = null, condVal2 = null, operator = null, targetPriority = 'nearest') {
    this._pushState();
    this.rules.push(this._newRule(condId, condVal, actId, prio, condId2, condVal2, operator, targetPriority));
    this.saveToStorage();
    this._emit('rules');
  }
  setRuleTargetPriority(ruleId, priority) {
    const r = this.rules.find(r => r.id === ruleId);
    if (r && r.targetPriority !== priority) {
      this._pushState();
      r.targetPriority = priority;
      this.saveToStorage();
      this._emit('rules');
    }
  }
  removeRule(ruleId) {
    this._pushState();
    this.rules = this.rules.filter(r => r.id !== ruleId);
    this.saveToStorage();
    this._emit('rules');
  }
  setRulePriority(ruleId, prio) {
    const r = this.rules.find(r => r.id === ruleId);
    if (r && r.priority !== (prio|0)) {
      this._pushState();
      r.priority = Math.max(0, Math.min(100, prio|0));
      this.saveToStorage();
      this._emit('rules');
    }
  }
  setRuleConditionValue(ruleId, value) {
    const r = this.rules.find(r => r.id === ruleId);
    if (r && r.conditionValue !== value) {
      this._pushState();
      r.conditionValue = value;
      this.saveToStorage();
      this._emit('rules');
    }
  }
  setRuleConditionValue2(ruleId, value) {
    const r = this.rules.find(r => r.id === ruleId);
    if (r && r.conditionValue2 !== value) {
      this._pushState();
      r.conditionValue2 = value;
      this.saveToStorage();
      this._emit('rules');
    }
  }
  setRuleAction(ruleId, actId) {
    const r = this.rules.find(r => r.id === ruleId);
    if (r && r.actionId !== actId) {
      this._pushState();
      r.actionId = actId;
      this.saveToStorage();
      this._emit('rules');
    }
  }
  setRuleCondition(ruleId, condId) {
    const r = this.rules.find(r => r.id === ruleId);
    if (r && r.conditionId !== condId) {
      this._pushState();
      r.conditionId = condId;
      const cd = GameDatabase.getCondition(condId);
      r.conditionValue = cd ? cd.defaultValue : null;
      this.saveToStorage();
      this._emit('rules');
    }
  }
  setRuleCondition2(ruleId, condId2) {
    const r = this.rules.find(r => r.id === ruleId);
    if (r && r.conditionId2 !== condId2) {
      this._pushState();
      r.conditionId2 = condId2;
      const cd = GameDatabase.getCondition(condId2);
      r.conditionValue2 = cd ? cd.defaultValue : null;
      this.saveToStorage();
      this._emit('rules');
    }
  }
  setRuleOperator(ruleId, op) {
    const r = this.rules.find(r => r.id === ruleId);
    if (r && r.operator !== op) {
      this._pushState();
      r.operator = op || null;
      if (!op) {
        r.conditionId2 = null;
        r.conditionValue2 = null;
      } else if (!r.conditionId2) {
        const avail = this.availableConditionIds();
        r.conditionId2 = avail[0] || 'hp_low';
        const cd = GameDatabase.getCondition(r.conditionId2);
        r.conditionValue2 = cd ? cd.defaultValue : null;
      }
      this.saveToStorage();
      this._emit('rules');
    }
  }
  setRuleEnabled(ruleId, en) {
    const r = this.rules.find(r => r.id === ruleId);
    if (r && r.enabled !== en) {
      this._pushState();
      r.enabled = en;
      this.saveToStorage();
      this._emit('rules');
    }
  }

  _initMap() {
    this.mapNodes = [
      [ { id: '0_start', type: 'combat', battleIndex: 0, label: 'Calibration', completed: false } ],
      [
        { id: '1_a', type: 'combat', battleIndex: 1, label: 'Distance Test', completed: false },
        { id: '1_b', type: 'combat', battleIndex: 2, label: 'Charge Warning', completed: false }
      ],
      [
        { id: '2_a', type: 'combat', battleIndex: 3, label: 'Swarm', completed: false },
        { id: '2_b', type: 'repair', label: 'Nano-Repair (+25 Max HP)', completed: false }
      ],
      [
        { id: '3_a', type: 'combat', battleIndex: 4, label: 'Mixed Protocol', completed: false },
        { id: '3_b', type: 'upgrade', label: 'Upgrade Vault (Pick Passive)', completed: false }
      ],
      [ { id: '4_boss', type: 'combat', battleIndex: 5, label: 'Protocol Warden', completed: false } ]
    ];
  }

  getActiveBattle() {
    if (this.currentMapColumn >= this.mapNodes.length) return null;
    const colNodes = this.mapNodes[this.currentMapColumn];
    if (!colNodes) return null;
    const node = colNodes.find(n => n.id === this.selectedNodeId);
    if (node && node.type === 'combat') {
      return GameDatabase.getBattle(node.battleIndex);
    }
    return GameDatabase.getBattle(this.currentBattleIndex);
  }

  selectMapNode(nodeId) {
    const nextCol = this.mapNodes[this.currentMapColumn];
    if (!nextCol) return;
    const node = nextCol.find(n => n.id === nodeId);
    if (!node) return;

    this.selectedNodeId = nodeId;

    if (node.type === 'repair') {
      node.completed = true;
      this.stats.max_hp += 25;
      this.currentMapColumn += 1;
      const nCol = this.mapNodes[this.currentMapColumn];
      this.selectedNodeId = nCol ? nCol[0].id : null;
      this._emit('stats');
      AudioManager.play('shield_on');
    } else if (node.type === 'upgrade') {
      node.completed = true;
      this.currentMapColumn += 1;
      const nCol = this.mapNodes[this.currentMapColumn];
      this.selectedNodeId = nCol ? nCol[0].id : null;
      this.saveToStorage();
      this._emit('progress');
      if (this.onUpgradeNodeTriggered) {
        this.onUpgradeNodeTriggered();
      }
    }

    this.saveToStorage();
    this._emit('progress');
  }

  saveToStorage() {
    try {
      const data = {
        currentBattleIndex: this.currentBattleIndex,
        currentMapColumn: this.currentMapColumn,
        selectedNodeId: this.selectedNodeId,
        mapNodes: this.mapNodes,
        teachNode: this.teachNode,
        stats: this.stats,
        unlockedConditionIds: this.unlockedConditionIds,
        unlockedActionIds: this.unlockedActionIds,
        rules: this.rules,
        _ruleCounter: this._ruleCounter,
      };
      localStorage.setItem('overlogic_run_save', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem('overlogic_run_save');
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.currentBattleIndex = data.currentBattleIndex ?? 0;
      this.currentMapColumn = data.currentMapColumn ?? 0;
      this.selectedNodeId = data.selectedNodeId ?? '0_start';
      this.mapNodes = data.mapNodes;
      if (!this.mapNodes || this.mapNodes.length === 0) {
        this._initMap();
      }
      this.teachNode = data.teachNode ?? 1;
      this.stats = data.stats ?? baseStats();
      this.unlockedConditionIds = data.unlockedConditionIds ?? [];
      this.unlockedActionIds = data.unlockedActionIds ?? [];
      this.rules = data.rules ?? [];
      this._ruleCounter = data._ruleCounter ?? 0;
      return true;
    } catch (e) {
      console.error('Failed to load from localStorage', e);
      return false;
    }
  }

  clearStorage() {
    try {
      localStorage.removeItem('overlogic_run_save');
    } catch (e) {}
    this.resetRun();
  }

  saveLoadout(slotIndex) {
    try {
      localStorage.setItem(`overlogic_loadout_slot_${slotIndex}`, JSON.stringify(this.rules));
      return true;
    } catch (e) {
      console.error(`Failed to save loadout for slot ${slotIndex}`, e);
      return false;
    }
  }

  loadLoadout(slotIndex) {
    try {
      const raw = localStorage.getItem(`overlogic_loadout_slot_${slotIndex}`);
      if (!raw) return false;
      this._pushState();
      const loadedRules = JSON.parse(raw);
      const availConds = this.availableConditionIds();
      const availActs = this.availableActionIds();
      const prevLength = loadedRules.length;
      this.rules = loadedRules.filter(r => {
        const condOk = availConds.includes(r.conditionId);
        const cond2Ok = !r.operator || availConds.includes(r.conditionId2);
        const actOk = availActs.includes(r.actionId);
        return condOk && cond2Ok && actOk;
      });
      this.saveToStorage();
      this._emit('rules');
      return { ok: true, filtered: this.rules.length < prevLength };
    } catch (e) {
      console.error(`Failed to load loadout for slot ${slotIndex}`, e);
      return false;
    }
  }

  hasLoadout(slotIndex) {
    try {
      return localStorage.getItem(`overlogic_loadout_slot_${slotIndex}`) !== null;
    } catch (e) {
      return false;
    }
  }

  availableConditionIds() {
    const out = GameDatabase.conditionsUnlockedByTeach(this.teachNode);
    for (const id of this.unlockedConditionIds) if (!out.includes(id)) out.push(id);
    return out;
  }
  availableActionIds() {
    const out = GameDatabase.actionsUnlockedByTeach(this.teachNode);
    for (const id of this.unlockedActionIds) if (!out.includes(id)) out.push(id);
    return out;
  }

  isDemoCleared() {
    return this.currentMapColumn >= this.mapNodes.length;
  }
}

export const GameState = new GameStateClass();

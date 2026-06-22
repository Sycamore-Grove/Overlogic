// LogicEditorUI.js — the most important screen. Lists conditions/actions, shows rules,
// lets player add/delete/edit rules + priority + condition param + action. Start button.
// Mirrors scripts/ui/LogicEditorUI.gd.

import { GameState } from '../core/GameState.js';
import { GameDatabase } from '../core/GameDatabase.js';
import { GameManager } from '../core/GameManager.js';
import { AudioManager } from '../systems/AudioManager.js';

export class LogicEditorUI {
  constructor() {
    this.el = document.getElementById('screen-editor');
    this.condList = document.getElementById('cond-list');
    this.actList  = document.getElementById('act-list');
    this.ruleList = document.getElementById('rule-list');
    this.btnAddRule = document.getElementById('btn-add-rule');
    this.ruleForm = document.getElementById('rule-form');
    this.fCond = document.getElementById('f-cond');
    this.fCondParam = document.getElementById('f-cond-param');
    this.fAct = document.getElementById('f-act');
    this.fPrio = document.getElementById('f-prio');
    this.fAdd = document.getElementById('f-add');
    this.fCancel = document.getElementById('f-cancel');
    this.edBattleName = document.getElementById('ed-battle-name');
    this.edBattlePreview = document.getElementById('ed-battle-preview');
    this.edTeach = document.getElementById('ed-teach');
    this.unitStats = document.getElementById('unit-stats');
    this.btnRun = document.getElementById('btn-run');
    this._bind();
    // re-render when state changes
    GameState.on('rules', () => this.renderRules());
    GameState.on('stats', () => this.renderStats());
    GameState.on('progress', () => this.renderHeader());
  }

  show() {
    this.renderAll();
  }

  renderAll() {
    this.renderHeader();
    this.renderModules();
    this.renderRules();
    this.renderStats();
  }

  renderHeader() {
    const battle = GameDatabase.getBattle(GameState.currentBattleIndex);
    if (battle) {
      this.edBattleName.textContent = `${GameState.currentBattleIndex + 1}. ${battle.displayName}`;
      // enemy preview
      const parts = battle.enemySpawns.map(s => `${s.count}× ${s.enemyId}`).join(', ');
      this.edBattlePreview.textContent = `// ${parts}`;
    } else {
      this.edBattleName.textContent = '—';
      this.edBattlePreview.textContent = '';
    }
    this.edTeach.textContent = GameState.teachNode;
  }

  renderModules() {
    // Conditions
    this.condList.innerHTML = '';
    for (const id of GameState.availableConditionIds()) {
      const c = GameDatabase.getCondition(id);
      if (!c) continue;
      const li = document.createElement('li');
      li.innerHTML = `<span class="mod-name">${c.displayName}</span>` +
        `<span class="mod-desc">${c.description}</span>` +
        (c.parameterType !== 'none' ? `<span class="mod-meta">param: ${c.parameterType}</span>` : '');
      this.condList.appendChild(li);
    }
    // Actions
    this.actList.innerHTML = '';
    for (const id of GameState.availableActionIds()) {
      const a = GameDatabase.getAction(id);
      if (!a) continue;
      const li = document.createElement('li');
      li.innerHTML = `<span class="mod-name">${a.displayName}</span>` +
        `<span class="mod-desc">${a.description}</span>` +
        `<span class="mod-meta">cd ${a.cooldown}s · e${a.energyCost} · r${a.range}</span>`;
      this.actList.appendChild(li);
    }
  }

  renderRules() {
    this.ruleList.innerHTML = '';
    for (const r of GameState.rules) {
      const row = this._buildRow(r);
      this.ruleList.appendChild(row);
    }
  }

  _buildRow(r) {
    const c = GameDatabase.getCondition(r.conditionId);
    const a = GameDatabase.getAction(r.actionId);
    const row = document.createElement('div');
    row.className = 'rule-row';
    row.dataset.id = r.id;

    // priority input
    const prio = document.createElement('input');
    prio.type = 'number'; prio.min = 0; prio.max = 100; prio.value = r.priority;
    prio.className = 'rule-prio';
    prio.style.width = '50px';
    prio.addEventListener('change', () => {
      GameState.setRulePriority(r.id, +prio.value);
      AudioManager.play('button_click');
    });

    // condition select
    const condSel = this._condSelect(r.conditionId);
    condSel.addEventListener('change', () => {
      GameState.setRuleCondition(r.id, condSel.value);
      AudioManager.play('button_click');
    });

    // param cell (depends on condition type)
    const paramCell = document.createElement('span');
    paramCell.className = 'rule-param';
    this._fillParamCell(paramCell, r);

    // action select
    const actSel = this._actSelect(r.actionId);
    actSel.addEventListener('change', () => {
      GameState.setRuleAction(r.id, actSel.value);
      AudioManager.play('button_click');
    });

    // delete btn
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '✕'; del.title = 'delete';
    del.addEventListener('click', () => {
      GameState.removeRule(r.id);
      AudioManager.play('rule_add');
    });

    // enable toggle
    const tog = document.createElement('input');
    tog.type = 'checkbox'; tog.checked = r.enabled !== false; tog.title = 'enable/disable';
    tog.addEventListener('change', () => GameState.setRuleEnabled(r.id, tog.checked));

    row.appendChild(prio);
    const condWrap = document.createElement('div');
    condWrap.appendChild(condSel); condWrap.appendChild(tog);
    row.appendChild(condWrap);
    row.appendChild(paramCell);
    const actWrap = document.createElement('span');
    actWrap.textContent = '→ ';
    const actName = document.createElement('span'); actName.className = 'rule-act'; actName.textContent = a ? a.displayName : r.actionId;
    actWrap.appendChild(actName);
    row.appendChild(actWrap);
    row.appendChild(del);
    return row;
  }

  _condSelect(selected) {
    const sel = document.createElement('select');
    for (const id of GameState.availableConditionIds()) {
      const c = GameDatabase.getCondition(id);
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = c ? c.displayName : id;
      if (id === selected) opt.selected = true;
      sel.appendChild(opt);
    }
    return sel;
  }

  _actSelect(selected) {
    const sel = document.createElement('select');
    for (const id of GameState.availableActionIds()) {
      const a = GameDatabase.getAction(id);
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = a ? a.displayName : id;
      if (id === selected) opt.selected = true;
      sel.appendChild(opt);
    }
    return sel;
  }

  _fillParamCell(cell, r) {
    cell.innerHTML = '';
    const c = GameDatabase.getCondition(r.conditionId);
    if (!c || c.parameterType === 'none') { cell.textContent = ''; return; }
    if (c.parameterType === 'vec2') {
      const v = Array.isArray(r.conditionValue) ? r.conditionValue : c.defaultValue;
      const inpR = document.createElement('input'); inpR.type = 'number'; inpR.value = v[0]; inpR.step = 0.5; inpR.style.width = '50px';
      const inpC = document.createElement('input'); inpC.type = 'number'; inpC.value = v[1]; inpC.step = 1;   inpC.style.width = '40px';
      const apply = () => GameState.setRuleConditionValue(r.id, [+inpR.value, +inpC.value|0]);
      inpR.addEventListener('change', apply); inpC.addEventListener('change', apply);
      cell.appendChild(inpR); cell.appendChild(document.createTextNode(' / ')); cell.appendChild(inpC);
    } else if (c.parameterType === 'percent') {
      const inp = document.createElement('input'); inp.type = 'number'; inp.min = 5; inp.max = 95; inp.value = Math.round(r.conditionValue * 100); inp.style.width = '50px';
      const suffix = document.createTextNode('%');
      inp.addEventListener('change', () => GameState.setRuleConditionValue(r.id, +inp.value / 100));
      cell.appendChild(inp); cell.appendChild(suffix);
    } else if (c.parameterType === 'int') {
      const inp = document.createElement('input'); inp.type = 'number'; inp.value = r.conditionValue|0; inp.style.width = '50px';
      inp.addEventListener('change', () => GameState.setRuleConditionValue(r.id, +inp.value|0));
      cell.appendChild(inp);
    } else { // float
      const inp = document.createElement('input'); inp.type = 'number'; inp.step = 0.5; inp.value = r.conditionValue; inp.style.width = '60px';
      inp.addEventListener('change', () => GameState.setRuleConditionValue(r.id, +inp.value));
      cell.appendChild(inp);
    }
  }

  renderStats() {
    const s = GameState.stats;
    this.unitStats.innerHTML =
      `<span class="stat">HP<b>${s.max_hp}</b></span>` +
      `<span class="stat">EN<b>${s.max_energy}</b></span>` +
      `<span class="stat">Regen<b>${s.energy_regen.toFixed(1)}/s</b></span>` +
      `<span class="stat">SPD<b>${s.move_speed}</b></span>` +
      `<span class="stat">DMG<b>${s.basic_dmg.toFixed(1)}</b></span>` +
      `<span class="stat">DashCD<b>${s.dash_cd.toFixed(1)}s</b></span>` +
      `<span class="stat">ShieldCD<b>${s.shield_cd}s</b></span>`;
  }

  _bind() {
    this.btnAddRule.addEventListener('click', () => {
      AudioManager.play('button_click');
      this._openAddForm();
    });
    this.fCancel.addEventListener('click', () => {
      this.ruleForm.classList.add('hidden');
    });
    this.fAdd.addEventListener('click', () => {
      const condId = this.fCond.value;
      const actId = this.fAct.value;
      const prio = +this.fPrio.value || 50;
      const c = GameDatabase.getCondition(condId);
      const val = this._readFormParam(c);
      GameState.addRule(condId, val, actId, prio);
      AudioManager.play('rule_add');
      this.ruleForm.classList.add('hidden');
    });
    this.fCond.addEventListener('change', () => this._refreshFormParam());
    this.btnRun.addEventListener('click', () => {
      AudioManager.play('button_click');
      GameManager.goCombat();
    });
  }

  _openAddForm() {
    // populate dropdowns
    this.fCond.innerHTML = '';
    for (const id of GameState.availableConditionIds()) {
      const c = GameDatabase.getCondition(id);
      const opt = document.createElement('option'); opt.value = id; opt.textContent = c ? c.displayName : id;
      this.fCond.appendChild(opt);
    }
    this.fAct.innerHTML = '';
    for (const id of GameState.availableActionIds()) {
      const a = GameDatabase.getAction(id);
      const opt = document.createElement('option'); opt.value = id; opt.textContent = a ? a.displayName : id;
      this.fAct.appendChild(opt);
    }
    this.fPrio.value = 50;
    this._refreshFormParam();
    this.ruleForm.classList.remove('hidden');
  }

  _refreshFormParam() {
    const c = GameDatabase.getCondition(this.fCond.value);
    this.fCondParam.innerHTML = '';
    if (!c || c.parameterType === 'none') return;
    if (c.parameterType === 'vec2') {
      const v = c.defaultValue;
      const inpR = document.createElement('input'); inpR.type = 'number'; inpR.value = v[0]; inpR.step = 0.5; inpR.id = 'fp-r'; inpR.style.width = '50px';
      const inpC = document.createElement('input'); inpC.type = 'number'; inpC.value = v[1]; inpC.step = 1;   inpC.id = 'fp-c'; inpC.style.width = '40px';
      this.fCondParam.appendChild(inpR); this.fCondParam.appendChild(document.createTextNode(' / ')); this.fCondParam.appendChild(inpC);
    } else if (c.parameterType === 'percent') {
      const inp = document.createElement('input'); inp.type = 'number'; inp.value = Math.round(c.defaultValue * 100); inp.min = 5; inp.max = 95; inp.id = 'fp-pct'; inp.style.width = '50px';
      this.fCondParam.appendChild(inp); this.fCondParam.appendChild(document.createTextNode('%'));
    } else if (c.parameterType === 'int') {
      const inp = document.createElement('input'); inp.type = 'number'; inp.value = c.defaultValue|0; inp.id = 'fp-int'; inp.style.width = '50px';
      this.fCondParam.appendChild(inp);
    } else {
      const inp = document.createElement('input'); inp.type = 'number'; inp.value = c.defaultValue; inp.step = 0.5; inp.id = 'fp-flt'; inp.style.width = '60px';
      this.fCondParam.appendChild(inp);
    }
  }

  _readFormParam(c) {
    if (!c || c.parameterType === 'none') return null;
    if (c.parameterType === 'vec2') {
      const r = document.getElementById('fp-r'), cc = document.getElementById('fp-c');
      return [+r.value, +cc.value|0];
    }
    if (c.parameterType === 'percent') {
      const inp = document.getElementById('fp-pct');
      return +inp.value / 100;
    }
    if (c.parameterType === 'int') {
      const inp = document.getElementById('fp-int');
      return +inp.value|0;
    }
    const inp = document.getElementById('fp-flt');
    return +inp.value;
  }
}

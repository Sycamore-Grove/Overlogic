// GameManager.js — top-level FSM: MainMenu / LogicEditing / Combat / RewardSelection
// / PostBattleReport / Victory. Single-page screen switching.
// Mirrors scripts/core/GameManager.gd.

import { GameState } from './GameState.js';
import { GameDatabase } from './GameDatabase.js';

const State = {
  MainMenu: 'main', LogicEditing: 'editor', Combat: 'combat',
  RewardSelection: 'reward', PostBattleReport: 'report', Victory: 'victory',
};

class GameManager {
  constructor() {
    this.state = State.MainMenu;
    this.lastBattleWon = false;
  }

  _show(id) {
    for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden');
    document.getElementById('screen-' + id).classList.remove('hidden');
  }

  goMainMenu()    { this.state = State.MainMenu;        this._show('main'); }
  goLogicEdit()   { this.state = State.LogicEditing;    this._show('editor'); }
  goCombat()      { this.state = State.Combat;          this._show('combat'); }
  goRewardSelection() { this.state = State.RewardSelection; this._show('reward'); }
  goPostBattleReport() { this.state = State.PostBattleReport; this._show('report'); }
  goVictory()     { this.state = State.Victory;         this._show('victory'); }

  // Called by CombatArena when a battle ends.
  onBattleFinished(won) {
    this.lastBattleWon = won;
    if (won) {
      // Final boss cleared?
      const isLast = GameState.currentBattleIndex >= GameDatabase.getBattleCount() - 1;
      if (isLast) {
        GameState.onBattleWon('');
        this.goVictory();
      } else {
        this.goRewardSelection();
      }
    } else {
      this.goPostBattleReport();
    }
  }

  // Called by RewardScreen after player picks a reward.
  onRewardChosen(rewardId) {
    GameState.onBattleWon(rewardId);
    if (GameState.isDemoCleared()) this.goVictory();
    else this.goLogicEdit();
  }

  // Called by PostBattleReport buttons.
  onReportRetryBattle() { this.goCombat(); }
  onReportEditLogic()   { this.goLogicEdit(); }
  onReportRestartRun()  { GameState.resetRun(); this.goLogicEdit(); }
}

export const GameManager = new GameManager();
export { State };

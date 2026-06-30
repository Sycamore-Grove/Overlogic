// main.js — entry point. Loads data, wires screens, hosts CombatArena lifecycle.

import { GameDatabase } from './core/GameDatabase.js';
import { GameState } from './core/GameState.js';
import { GameManager } from './core/GameManager.js';
import { CombatArena } from './core/CombatArena.js';
import { MainMenu } from './ui/MainMenu.js';
import { LogicEditorUI } from './ui/LogicEditorUI.js';
import { BattleHUD } from './ui/BattleHUD.js';
import { RewardUI } from './ui/RewardUI.js';
import { PostBattleReportUI } from './ui/PostBattleReportUI.js';
import { VictoryUI } from './ui/VictoryUI.js';
import { AudioManager } from './systems/AudioManager.js';
import { BackgroundAnim } from './systems/BackgroundAnim.js';

async function main() {
  await GameDatabase.loadAll();

  // Initialize and run the cyber background animation
  const bgCanvas = document.getElementById('bg-canvas');
  if (bgCanvas) {
    const bgAnim = new BackgroundAnim(bgCanvas);
    bgAnim.start();
  }

  const mainMenu = new MainMenu();
  const logicEditor = new LogicEditorUI();
  const battleHUD = new BattleHUD(null);
  const rewardUI = new RewardUI();
  const reportUI = new PostBattleReportUI();
  const victoryUI = new VictoryUI();

  // Bulletproof viewport scroll locks to prevent browser auto-scroll / bouncing behaviors
  window.addEventListener('scroll', () => {
    window.scrollTo(0, 0);
  }, { passive: true });

  const screenCombat = document.getElementById('screen-combat');
  if (screenCombat) {
    screenCombat.addEventListener('scroll', () => {
      screenCombat.scrollTop = 0;
      screenCombat.scrollLeft = 0;
    }, { passive: true });
  }

  const canvas = document.getElementById('arena');
  let arena = null;

  GameState.onUpgradeNodeTriggered = () => {
    GameManager.isUpgradeReward = true;
    GameManager.goRewardSelection();
  };

  // Hook GameManager transitions to drive screen-specific setup.
  const origGoCombat = GameManager.goCombat.bind(GameManager);
  const origGoReward = GameManager.goRewardSelection.bind(GameManager);
  const origGoReport = GameManager.goPostBattleReport.bind(GameManager);
  const origGoLogic  = GameManager.goLogicEdit.bind(GameManager);
  const origGoMain   = GameManager.goMainMenu.bind(GameManager);
  const origGoVict   = GameManager.goVictory.bind(GameManager);
  const origGoSandbox = GameManager.goSandbox.bind(GameManager);

  GameManager.goCombat = () => {
    origGoCombat();
    const battle = GameState.getActiveBattle();
    if (!battle) { console.error('No active battle found'); return; }
    if (arena) arena.stop();
    arena = new CombatArena(canvas, battleHUD);
    battleHUD.arena = arena;
    arena.onFinished = (won) => GameManager.onBattleFinished(won);
    arena.start(battle);
  };
  GameManager.goSandbox = () => {
    origGoSandbox();
    const sandboxBattle = {
      id: 'sandbox',
      displayName: 'Sandbox Test Simulation',
      enemySpawns: [
        { enemyId: 'crawler', count: 2, wave: 1 },
        { enemyId: 'shooter', count: 1, wave: 1 },
        { enemyId: 'charger', count: 1, wave: 2 }
      ],
      arenaType: 'standard_20x20',
      rewardPool: []
    };
    if (arena) arena.stop();
    arena = new CombatArena(canvas, battleHUD);
    battleHUD.arena = arena;
    arena.onFinished = (won) => {
      // Return straight to editor in sandbox mode
      GameManager.goLogicEdit();
    };
    arena.start(sandboxBattle);
  };
  GameManager.goRewardSelection = () => { origGoReward(); rewardUI.show(); };
  GameManager.goPostBattleReport = () => { origGoReport(); reportUI.show(); };
  GameManager.goLogicEdit = () => { origGoLogic(); logicEditor.show(); };
  GameManager.goMainMenu = () => {
    origGoMain();
    if (arena) { arena.stop(); arena = null; }
  };
  GameManager.goVictory = () => {
    origGoVict();
    if (arena) { arena.stop(); arena = null; }
    victoryUI.show();
  };

  // Settings Overlay Wiring
  const settingsOverlay = document.getElementById('settings-overlay');
  const btnSettingsMain = document.getElementById('btn-settings');
  const btnSettingsEditor = document.getElementById('btn-editor-settings');
  const btnSettingsCombat = document.getElementById('btn-combat-settings');
  const btnSettingsClose = document.getElementById('btn-settings-close');
  const btnSettingsSave = document.getElementById('btn-settings-save');

  const settingVolume = document.getElementById('setting-volume');
  const settingVolumeVal = document.getElementById('setting-volume-val');
  const settingMute = document.getElementById('setting-mute');
  const settingShake = document.getElementById('setting-shake');

  function openSettings() {
    AudioManager.resume();
    // Load current values from GameState
    settingVolume.value = GameState.settings.volume;
    settingVolumeVal.textContent = `${Math.round(GameState.settings.volume * 100)}%`;
    settingMute.checked = GameState.settings.mute;
    settingShake.checked = GameState.settings.screenShake;

    settingsOverlay.classList.remove('hidden');
    AudioManager.play('button_click');
  }

  function closeSettings() {
    settingsOverlay.classList.add('hidden');
    AudioManager.play('button_click');
  }

  if (btnSettingsMain) btnSettingsMain.addEventListener('click', openSettings);
  if (btnSettingsEditor) btnSettingsEditor.addEventListener('click', openSettings);
  if (btnSettingsCombat) btnSettingsCombat.addEventListener('click', openSettings);
  if (btnSettingsClose) btnSettingsClose.addEventListener('click', closeSettings);

  if (settingVolume) {
    settingVolume.addEventListener('input', () => {
      settingVolumeVal.textContent = `${Math.round(settingVolume.value * 100)}%`;
      // Real-time preview of volume
      AudioManager.setVolume(settingVolume.value);
    });
  }

  if (btnSettingsSave) {
    btnSettingsSave.addEventListener('click', () => {
      GameState.settings.volume = parseFloat(settingVolume.value);
      GameState.settings.mute = settingMute.checked;
      GameState.settings.screenShake = settingShake.checked;
      GameState.saveSettings();
      
      closeSettings();
      AudioManager.play('rule_add'); // Success arpeggio
    });
  }

  // Start at main menu
  GameManager.goMainMenu();
}

main().catch(err => {
  console.error('Overlogic boot failed:', err);
  document.body.innerHTML = `<div style="padding:24px;color:#f55;font-family:monospace">Boot failed: ${err}<br>Run via a local web server (e.g. <code>python -m http.server</code>) — fetch() needs http, not file://.</div>`;
});

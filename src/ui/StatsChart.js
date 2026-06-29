// StatsChart.js — Custom 2D Canvas chart renderer for cyberpunk run analytics.

import { GameDatabase } from '../core/GameDatabase.js';

export function drawStatsChart(canvas, report) {
  if (!canvas || !report) return;
  const g = canvas.getContext('2d');

  // High DPI / Retina Support
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width || 680;
  const cssH = rect.height || 200;

  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  g.scale(dpr, dpr);
  const W = cssW;
  const H = cssH;

  // Clear background
  g.fillStyle = '#0a0d1a';
  g.fillRect(0, 0, W, H);

  // Draw background grid lines (cyberpunk style)
  g.strokeStyle = 'rgba(0, 210, 255, 0.08)';
  g.lineWidth = 1;
  for (let x = 30; x < W; x += 40) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
  }
  for (let y = 20; y < H; y += 30) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }

  // Split canvas into two columns: Left = Actions, Right = Damage
  const colW = W / 2;
  
  // Font settings
  g.font = '11px monospace';
  g.textAlign = 'left';
  g.textBaseline = 'middle';

  // --- 1. Draw Action Usage (Left Column) ---
  g.fillStyle = '#00d2ff';
  g.font = 'bold 12px monospace';
  g.fillText('ACTION USAGE', 20, 20);
  
  g.font = '10px monospace';
  const actions = Object.entries(report.action_usage || {}).sort((a, b) => b[1] - a[1]);
  const maxActions = 4;
  const slicedActions = actions.slice(0, maxActions);
  const maxActionCount = Math.max(1, ...actions.map(a => a[1]));

  let ay = 50;
  if (slicedActions.length === 0) {
    g.fillStyle = '#888';
    g.fillText('(No actions executed)', 20, ay);
  } else {
    for (const [actId, count] of slicedActions) {
      const act = GameDatabase.getAction(actId);
      const name = act ? act.displayName : actId;
      
      g.fillStyle = '#8892b0';
      g.fillText(name.toUpperCase(), 20, ay);

      // Draw bar
      const barMaxW = colW - 140;
      const barW = (count / maxActionCount) * barMaxW;
      
      // Bar background
      g.fillStyle = 'rgba(0, 210, 255, 0.1)';
      g.fillRect(110, ay - 6, barMaxW, 12);

      // Glowing bar fill
      g.save();
      g.fillStyle = '#00ffc3';
      g.shadowColor = '#00ffc3';
      g.shadowBlur = 8;
      g.fillRect(110, ay - 6, barW, 12);
      g.restore();

      // Count text
      g.fillStyle = '#ffffff';
      g.fillText(`x${count}`, 115 + barW, ay);

      ay += 36;
    }
  }

  // --- 2. Draw Damage Taken (Right Column) ---
  g.fillStyle = '#ff4757';
  g.font = 'bold 12px monospace';
  g.fillText('DAMAGE BY SOURCE', colW + 20, 20);

  g.font = '10px monospace';
  const damageSources = Object.entries(report.damage_by_source || {}).sort((a, b) => b[1] - a[1]);
  const maxDmg = Math.max(1, ...damageSources.map(d => d[1]));
  
  let dy = 50;
  if (damageSources.length === 0) {
    g.fillStyle = '#888';
    g.fillText('(No damage taken)', colW + 20, dy);
  } else {
    for (const [source, dmg] of damageSources.slice(0, maxActions)) {
      const enemy = GameDatabase.getEnemy(source);
      const name = enemy ? enemy.displayName : source;

      g.fillStyle = '#8892b0';
      g.fillText(name.toUpperCase(), colW + 20, dy);

      // Draw bar
      const barMaxW = colW - 140;
      const barW = (dmg / maxDmg) * barMaxW;
      
      // Bar background
      g.fillStyle = 'rgba(255, 71, 87, 0.1)';
      g.fillRect(colW + 110, dy - 6, barMaxW, 12);

      // Glowing bar fill
      g.save();
      g.fillStyle = '#ff4757';
      g.shadowColor = '#ff4757';
      g.shadowBlur = 8;
      g.fillRect(colW + 110, dy - 6, barW, 12);
      g.restore();

      // Dmg text
      g.fillStyle = '#ffffff';
      g.fillText(`${Math.round(dmg)} DMG`, colW + 115 + barW, dy);

      dy += 36;
    }
  }
}

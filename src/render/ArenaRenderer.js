// ArenaRenderer.js — Canvas 2D main draw. Draws arena grid, robot, enemies, projectiles,
// mines, particles. All entities drawn via camera-translated context so EnemyBase.draw
// (which uses absolute world coords * scale) renders at the correct screen position.

export function drawArena(g, canvas, ctx, camera) {
  const W = canvas.width, H = canvas.height;
  const scale = W / 20;   // 20m arena → canvas
  const cam = camera.offset();
  const ox = W / 2 - camera.x * scale + cam.x;
  const oy = H / 2 - camera.y * scale + cam.y;

  // Background
  g.fillStyle = '#03050a';
  g.fillRect(0, 0, W, H);

  // Circuit grid
  g.strokeStyle = 'rgba(75,225,255,0.06)';
  g.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    g.beginPath(); g.moveTo(ox + i * scale, oy - 10 * scale); g.lineTo(ox + i * scale, oy + 10 * scale); g.stroke();
    g.beginPath(); g.moveTo(ox - 10 * scale, oy + i * scale); g.lineTo(ox + 10 * scale, oy + i * scale); g.stroke();
  }
  // Arena border (neon)
  g.strokeStyle = 'rgba(75,225,255,0.5)';
  g.lineWidth = 2;
  g.strokeRect(ox - 10 * scale, oy - 10 * scale, 20 * scale, 20 * scale);
  g.lineWidth = 1;

  // Translate the whole world → screen. Entity .draw() uses (this.x * scale) expecting
  // origin at (0,0); we shift so origin lands at (ox, oy).
  g.save();
  g.translate(ox, oy);

  // Mines
  for (const m of ctx.mines) m.draw(g, scale);
  // Projectiles
  for (const p of ctx.projectiles) p.draw(g, scale);
  // Enemies (EnemyBase.draw uses this.x*scale — now offset by g.translate)
  for (const e of ctx.enemies) e.draw(g, scale);
  // Particles
  for (const p of ctx.particles) p.draw(g, scale);
  // Robot
  drawRobot(g, ctx.robot, scale);

  g.restore();
}

function drawRobot(g, robot, scale) {
  if (!robot) return;
  const sz = robot.bodyRadius * 2 * scale;
  g.fillStyle = robot.dead ? '#555' : '#6ec8ff';
  g.fillRect(robot.x * scale - sz/2, robot.y * scale - sz/2, sz, sz);
  if (robot.shieldTimer > 0) {
    g.strokeStyle = `rgba(80,200,255,${0.4 + 0.3 * Math.sin(performance.now()/80)})`;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(robot.x * scale, robot.y * scale, sz * 0.9, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1;
  }
  if (robot.overdriveTimer > 0) {
    g.fillStyle = 'rgba(255,200,80,0.35)';
    g.beginPath();
    g.arc(robot.x * scale, robot.y * scale, sz * 0.8, 0, Math.PI * 2);
    g.fill();
  }
}

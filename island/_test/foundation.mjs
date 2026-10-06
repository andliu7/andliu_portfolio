// Foundation check: load, start, errors, fps, teleport to every zone, interior enter/exit, keyboard via CDP.
const keepAlive = setInterval(() => {}, 1000);
import { connect, sleep } from './cdp.mjs';
const PORT = Number(process.env.PORT || 9351);
const out = new URL('../_shots/foundation/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const c = await connect(PORT);
const errors = [], warns = [];
c.on(m => {
  if(m.method === 'Runtime.consoleAPICalled'){
    const txt = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
    if(m.params.type === 'error') errors.push(txt); else if(m.params.type === 'warning') warns.push(txt);
  }
  if(m.method === 'Runtime.exceptionThrown') errors.push('EXC ' + JSON.stringify(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if(m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('LOG ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
});
await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Log.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'http://127.0.0.1:4297/island/index.html?' + Date.now() });
for(let i = 0; i < 60; i++){ await sleep(250); if(await c.evaluate('!!(window.__island && window.__island.ready)').catch(() => false)) break; }
const res = {};
res.ready = await c.evaluate('__island.ready');
res.modules = await c.evaluate('__island.modules()');
res.failures = await c.evaluate('__island.failures');
await c.shot(out + '00-start-screen.jpg');
await c.evaluate('__island.start(false)');
await sleep(2500);
res.fps = await c.evaluate('__island.fps()');
res.mode = await c.evaluate('__island.mode()');
await c.shot(out + '01-spawn.jpg');

// keyboard through CDP: hold W for 1.2s
const key = (type, code, key, vk) => c.send('Input.dispatchKeyEvent', { type, code, key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
const p0 = await c.evaluate('__island.player()');
await key('rawKeyDown', 'KeyW', 'w', 87); await sleep(1200); await key('keyUp', 'KeyW', 'w', 87);
const p1 = await c.evaluate('__island.player()');
res.keyW_moved = Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2);
// keyCode-only event (no code field)
const q0 = await c.evaluate('__island.player()');
await c.send('Input.dispatchKeyEvent', { type:'rawKeyDown', windowsVirtualKeyCode: 38 }); await sleep(800); await c.send('Input.dispatchKeyEvent', { type:'keyUp', windowsVirtualKeyCode: 38 });
const q1 = await c.evaluate('__island.player()');
res.keyUpArrowNoCode_moved = Math.hypot(q1.x - q0.x, q1.z - q0.z).toFixed(2);
await key('rawKeyDown', 'KeyR', 'r', 82); await key('keyUp', 'KeyR', 'r', 82); await sleep(300);
res.afterR = await c.evaluate('__island.player()');

const ids = await c.evaluate('__island.zones()');
res.zones = {};
for(const id of ids){
  await c.evaluate(`__island.teleport(${JSON.stringify(id)})`);
  await sleep(900);
  res.zones[id] = { active: await c.evaluate('__island.activeZone()'), fps: await c.evaluate('__island.fps()') };
  if(['blueberry', 'umd', 'skills'].includes(id)) await c.shot(out + `02-zone-${id}.jpg`);
}

// every interior: enter, check, exit, check the car landed on the door point without being pushed
res.interiors = {};
for(const id of ids){
  await c.evaluate(`__island.teleport(${JSON.stringify(id)})`); await sleep(200);
  const ok = await c.evaluate(`__island.enterInterior(${JSON.stringify(id)})`);
  await sleep(400);
  const inMode = await c.evaluate('__island.mode()'), inside = await c.evaluate('__island.interior()');
  if(id === 'clinic'){ await sleep(500); await c.shot(out + '03-interior-clinic.jpg'); res.interiorFps = await c.evaluate('__island.fps()'); }
  await c.evaluate('__island.exitInterior()');
  await sleep(500);
  const door = await c.evaluate(`(() => { const d = __island.ctx.island.doorOf(${JSON.stringify(id)}); return d; })()`);
  const p = await c.evaluate('__island.player()');
  res.interiors[id] = { ok, inMode, inside, outMode: await c.evaluate('__island.mode()'), pushed: Math.hypot(p.x - door.x, p.z - door.z).toFixed(2) };
  if(id === 'clinic'){ await sleep(600); await c.shot(out + '04-after-exit-clinic.jpg'); }
}
// Esc via CDP leaves an interior
await c.evaluate('__island.enterInterior("umd")'); await sleep(300);
await key('rawKeyDown', 'Escape', 'Escape', 27); await key('keyUp', 'Escape', 'Escape', 27); await sleep(300);
res.escLeaves = await c.evaluate('__island.mode()');
// modes and games
res.setWalk = await c.evaluate('__island.setMode("walk")'); res.modeWalk = await c.evaluate('__island.mode()');
res.setDrive = await c.evaluate('__island.setMode("drive")');
res.games = await c.evaluate('__island.games()');
res.startGame = await c.evaluate('__island.startGame("brush-up")'); await sleep(200);
res.gamePanel = await c.evaluate('document.querySelector("#game-root").children.length');
await c.evaluate('__island.stopGame()');
res.menuItems = await c.evaluate('document.querySelectorAll("#places button").length');
await c.evaluate('__island.teleport("spawn")'); await sleep(1500);
res.fpsFinal = await c.evaluate('__island.fps()');
res.consoleErrors = errors; res.warnings = warns;
console.log(JSON.stringify(res, null, 1));
c.close(); clearInterval(keepAlive);

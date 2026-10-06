const keepAlive = setInterval(() => {}, 1000);
import { connect, sleep } from './cdp.mjs';
const c = await connect(9351);
const errs = []; c.on(m => { if(m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value ?? '').join(' ').slice(0, 90)); });
await c.send('Runtime.enable'); await c.send('Page.enable');
await c.send('Page.navigate', { url: 'http://127.0.0.1:4297/island/index.html?r=' + Date.now() });
for(let i = 0; i < 60; i++){ await sleep(250); if(await c.evaluate('!!(window.__island && window.__island.ready)').catch(() => false)) break; }
await c.evaluate('__island.start(false)'); await sleep(1000);
const r = { ready: await c.evaluate('__island.ready'), modules: await c.evaluate('__island.modules()'), fps: await c.evaluate('__island.fps()'),
  enterNow: await c.evaluate('__island.enterInterior("now")'), placeholder: await c.evaluate('__island.ctx.state.interior.placeholder'), errs };
console.log(JSON.stringify(r)); c.close(); clearInterval(keepAlive);

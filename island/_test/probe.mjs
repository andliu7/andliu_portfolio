// Quick health probe: ready, module failures, console errors, fps, one screenshot.
import { connect, sleep } from './cdp.mjs';
const c = await connect(Number(process.env.PORT || 9351));
const errors = [];
c.on(m => {
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 300));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 300));
});
await c.send('Runtime.enable'); await c.send('Page.enable');
await c.send('Page.navigate', { url: 'http://127.0.0.1:4297/island/index.html?' + Date.now() });
let ready = false;
for (let i = 0; i < 80 && !ready; i++) { await sleep(250); ready = await c.evaluate('!!(window.__island && window.__island.ready)').catch(() => false); }
console.log('ready', ready);
if (ready) {
  console.log('failures', JSON.stringify(await c.evaluate('__island.failures')));
  await c.evaluate('__island.start(false)'); await sleep(3000);
  console.log('fps', await c.evaluate('__island.fps()'), 'mode', await c.evaluate('__island.mode()'));
  await c.shot(process.env.SHOT || 'probe.jpg');
}
console.log('errors', JSON.stringify(errors, null, 1));
c.close(); process.exit(0);

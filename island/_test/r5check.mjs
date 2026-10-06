// Round 5 spot checks on the page probe.mjs loaded: F hops out, the dialog box, first person.
import { connect, sleep } from './cdp.mjs';
const c = await connect(Number(process.env.PORT || 9530));
await c.send('Runtime.enable');
const ev = e => c.evaluate(e).catch(err => 'ERR ' + String(err).slice(0, 200));
await ev("__island.key('KeyF'); __island.key('KeyF', false); 0"); await sleep(6000);
console.log('after F, mode =', await ev('__island.mode()'));
await ev("void __island.ctx.modules.dialog.say({name:'Test',portrait:'berry',lines:['Hello there.'],choices:['Yes','No']}); 0"); await sleep(5000);
console.log('dialog', await ev('JSON.stringify(__island.dialog?.state?.())'));
await c.shot('_test/r5-dialog.jpg');
await ev('__island.ctx.modules.dialog.close(); 0'); await sleep(1500);
await ev("__island.key('KeyV'); __island.key('KeyV', false); 0"); await sleep(6000);
const fp = await ev('JSON.stringify(__island.camera?.info?.().fp)');
console.log('fp', String(fp).slice(0, 300));
await c.shot('_test/r5-fp.jpg');
c.close(); process.exit(0);

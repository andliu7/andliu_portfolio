// Pure logic of src/ui/tracker.js: save format, sanitize, merge, counts. Run: node tracker.test.mjs
import assert from 'node:assert/strict';
const T = await import(new URL('../src/ui/tracker.js', import.meta.url).href);
const { ZONES } = await import(new URL('../src/data/zones.js', import.meta.url).href);
const { AREAS, SHARD_IDS } = await import(new URL('../src/space/kit.js', import.meta.url).href);
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok', name); };
const defs = { zones: ZONES.map(z => z.id), games: ['race','bowling','hunt','arrow-pusher','brush-up','fishing'], tour: true, areas: AREAS.map(a => a.id), shards: [...SHARD_IDS] };

ok('blank has the save shape', () => assert.deepEqual(Object.keys(T.blank()).sort(), ['areas','explored','games','islet','pets','shards','souvenirs','space','tour','v','visited']));
ok('sanitize survives junk', () => { for(const j of [null, 3, 'x', [], { visited: 'no', tour: 'yes', pets: -4 }]) assert.deepEqual(T.sanitize(j), T.blank()); });
ok('sanitize dedupes, drops non-strings, explored implies visited', () => {
  const s = T.sanitize({ visited: ['umd', 'umd', 7], explored: ['dock'], tour: true, pets: 2.7 });
  assert.deepEqual(s.visited, ['umd', 'dock']); assert.equal(s.tour, true); assert.equal(s.pets, 2); });
ok('sanitize round-trips through JSON', () => { const s = T.sanitize({ visited:['brain'], shards:['moon-1'], islet:true }); assert.deepEqual(T.sanitize(JSON.parse(JSON.stringify(s))), s); });
ok('merge unions, ors, maxes and never loses', () => {
  const m = T.merge({ visited:['umd'], shards:['moon-1'], pets:3 }, { visited:['dock','umd'], space:true, shards:['lab-2'], pets:1 });
  assert.deepEqual(m.visited.sort(), ['dock','umd']); assert.deepEqual(m.shards.sort(), ['lab-2','moon-1']); assert.equal(m.space, true); assert.equal(m.pets, 3);
  assert.deepEqual(T.merge(m, T.blank()), m); });
ok('counts of a blank save', () => { const c = T.counts(T.blank(), defs); assert.equal(c.done, 0); assert.equal(c.of, 12*2 + 6 + 1 + (2 + 4 + 8)); assert.equal(c.of, 45); });
ok('counts ignore unknown ids', () => { const c = T.counts(T.sanitize({ visited:['atlantis'], games:['tour','pong'], areas:['hub'] }), defs); assert.equal(c.done, 0); });
ok('counts a mixed save', () => {
  const s = T.sanitize({ visited:['umd','dock'], explored:['dock','brain'], games:['race'], tour:true, space:true, areas:['moon'], shards:['moon-1','moon-2'], islet:true });
  const c = T.counts(s, defs);
  assert.deepEqual(c.places, { visited:3, explored:2, of:12 }); assert.equal(c.games.played, 1); assert.equal(c.tour.done, 1);
  assert.equal(c.secrets.found, 1 + 1 + 2 + 1); assert.equal(c.done, 3 + 2 + 1 + 1 + 5); });
ok('without space or tour loaded, their items leave the total', () => { const c = T.counts(T.blank(), { ...defs, tour:false, areas:[], shards:[] }); assert.equal(c.of, 30); assert.equal(c.secrets.of, 0); });
console.log(`${n} passed`);

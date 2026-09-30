// Voices: little lines for the island characters.
// Walk or drive near a character and it turns to you, hops, and says a short line in a speech
// bubble, with a babble voice made of tiny synthesised blips (ctx.sound.tone, so the sound
// toggle silences it). Honking near someone gets a honk line. The tour can make anyone talk
// through ctx.modules.voices.say(). Every line is grounded in src/data/zones.js.
//
// Why DOM bubbles and not sprites: a DOM bubble is never tinted by the scene lights, fog or tone
// mapping, so it reads the same by day and at night, and its rectangle can be tested against
// the HUD rectangles so a bubble never sits on top of the card, map or hint.

// Lines per character type. `lines` for walking or driving up, `honk` for a honk nearby.
// Voice: base pitch (Hz), pitch spread, oscillator type, ms per letter.
const TYPES = {
  team: { name:'Blueberry team', voice:[560, 0.35, 'sine', 42], lines:[
    'We are a team of five. Andrew leads product!',
    'Organic chemistry, one step at a time.',
    'RDKit.js grades your mechanism right in the browser.',
    'Our molecules are drawn by a custom SVG renderer.',
    'It started as a flashcard tool for classmates.',
    'chem-core, curriculum, validators. So many packages!',
    'Supabase with row-level security. Safe berries.',
    'The investor deck has 19 slides. We counted.',
    'Push the electrons, not the berries!',
    'Grading runs on a bond-electron matrix. Neat, right?',
  ], honk:['Beep beep! Mind the berry patch!', 'Honk if you love organic chemistry!'] },
  brain: { name:'Brain buddy', voice:[640, 0.3, 'triangle', 46], lines:[
    'Notes, chat, food, workouts, goals. All in me!',
    'Say a meal out loud and it gets logged. Voice first!',
    'Private records stay behind Google sign-in.',
    'The shell is static, on GitHub Pages. Cozy.',
    'Did you log your workout today?',
    'The project dashboard lives up here too.',
    'Five tools in one app. I remember everything.',
  ], honk:['Ooh, a honk! Should I log that?', 'Loud thoughts! I like it.'] },
  director: { name:'Studio director', voice:[300, 0.25, 'square', 50], lines:[
    'Lights, camera, SVG frames!',
    'Reaction frames rendered in Python. Frame by frame.',
    'ffmpeg stitches it into a narrated video. Cut!',
    'No more hand-animated slides. Print it!',
    'He wrote the spec for figures in an online textbook.',
    'Every frame here is drawn in code. Action!',
  ], honk:['Quiet on set, please!', 'That honk was not in the script.'] },
  robot: { name:'Browser Use robot', voice:[440, 0.5, 'square', 38], lines:[
    'BEEP. Browser Use has 2,000+ users.',
    'Docs by Andrew. 200+ contributors used them. BOOP.',
    'I have browsed 20+ web environments. Bzzt.',
    'Every fix gets checked on a live agent run.',
    'Onboarding complete. Please enjoy the island.',
    'Async team over Slack and GitHub. Beep.',
  ], honk:['HONK DETECTED. RESPONDING: HONK.', 'Loud input received. Beep boop.'] },
  student: { name:'Student', voice:[720, 0.35, 'sine', 36], lines:[
    'Andrew taught us anatomy all the way to physics!',
    'SAT gains of 100 to 300 points here!',
    'Biology, genetics, chemistry. We did it all.',
    'Grading ran on Apps Script. So fast!',
    'Is this going to be on the test?',
    'Data-driven practice is the secret.',
  ], honk:['Is that the bell? Recess!', 'No honking in the school zone!'] },
  terrapin: { name:'Terrapin', voice:[190, 0.2, 'triangle', 70], lines:[
    'Fear the turtle. Slowly.',
    'Andrew studies Computer Science here.',
    'Class of May 2027. Shell yeah.',
    'Computational Genomics? I just like lettuce.',
    'Take your time. I always do.',
  ], honk:['Eep! Back in the shell!', 'Too loud for a turtle.'] },
  fan: { name:'UMD fan', voice:[430, 0.4, 'square', 38], lines:[
    'Go Terps! B.S. in Computer Science!',
    'Pre-dental track too. Busy guy!',
    'Machine Learning, Algorithms, Data Science. Whew.',
    'Say hi to the terrapin!',
    'Graduating May 2027. Go Terps!',
  ], honk:['Go Terps! Honk honk!', 'That is the spirit! Go Terps!'] },
  tooth: { name:'Tooth mascot', voice:[840, 0.25, 'sine', 44], lines:[
    'Pre-dental! Brush twice a day, okay?',
    'Future dentist, current builder.',
    'Floss first, then code.',
    'Hard ideas, made usable. Clean teeth, too.',
    'Open wide! Just kidding. Welcome to the clinic.',
  ], honk:['Yikes! That rattled my enamel.', 'Easy on the horn, easy on the gums.'] },
  family: { name:'Focus Family', voice:[500, 0.3, 'triangle', 44], lines:[
    'Welcome to Focus Family! Pull up a seat.',
    'Andrew is our leader and point of contact.',
    '25+ students in this circle. Say hi!',
    'The weekly digest reads the master calendar.',
    'Gemini sums up our shared folders every week.',
    'The procedure guides mean anyone can run events.',
  ], honk:['Hi! You are welcome to join us.', 'A honk hello! Hello back!'] },
  chef: { name:'Chef', voice:[270, 0.3, 'triangle', 48], lines:[
    'Off the clock! Something good is cooking.',
    'Cook, lift, garden. Repeat.',
    'Those garden beds? Landscape design practice.',
    'Mind the barbell, it tips over!',
    'The kitchen truck is open. Taste test?',
  ], honk:['Careful, the soup will spill!', 'Honk all you like, dinner is not ready.'] },
  now: { name:'Builder', voice:[520, 0.3, 'sine', 42], lines:[
    'The learning game now lives inside Blueberry.',
    'Second Brain: notes, food, workouts and goals.',
    'This empty plot is for whatever comes next.',
  ], honk:['Hard hat zone! Just kidding, hi!'] },
  mail: { name:'Mail carrier', voice:[580, 0.3, 'sine', 42], lines:[
    'Email is the fastest way to reach Andrew.',
    'The mailbox takes all your hellos.',
    'His GitHub link is on the card. Go look!',
  ], honk:['Special delivery! Beep beep!'] },
  plaza: { name:'Islander', voice:[500, 0.35, 'sine', 42], lines:[
    'Welcome to Andrew Liu Island!',
    'Every place here is one line of the resume.',
    'The Blueberry Lab is a big one. Go see it!',
    'Try knocking over the ANDREW blocks!',
    'Race the Island Loop, if you dare.',
    'Lost? The map is up in the corner.',
    'The dock is full of friendly robots.',
  ], honk:['Hi to you too!', 'Beep! Nice car!'] },
};
// Which type lives at which zone. UMD has two, told apart by height (the terrapin is short).
const ZONE_TYPE = { blueberry:'team', brain:'brain', studio:'director', dock:'robot', school:'student',
  umd:'fan', clinic:'tooth', chapel:'family', yard:'chef', now:'now', contact:'mail' };

const CSS = `
#voices{position:fixed;inset:0;z-index:4;pointer-events:none;overflow:hidden}
#voices .vb{position:absolute;left:0;top:0;max-width:240px;padding:8px 12px 9px;border-radius:16px;
  background:#fffaf0;color:#1f2a44;border:2px solid #1f2a44;box-shadow:0 4px 0 #1f2a4433,0 0 0 4px #fffaf055;
  font:600 14px/1.3 Fredoka,Nunito,system-ui,sans-serif;text-align:center;opacity:0;transition:opacity .18s;will-change:transform}
#voices .vb.on{opacity:1}
#voices .vb b{display:block;font:600 10px/1 Fredoka,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6b7390;margin-bottom:4px}
#voices .vb i{font-style:normal;color:transparent}
#voices .vb::after{content:"";position:absolute;left:50%;bottom:-9px;width:14px;height:14px;margin-left:-7px;background:#fffaf0;
  border-right:2px solid #1f2a44;border-bottom:2px solid #1f2a44;transform:rotate(45deg);border-bottom-right-radius:3px}
#voices .vb.below::after{bottom:auto;top:-9px;transform:rotate(225deg)}
@media (max-width:600px){#voices .vb{max-width:180px;font-size:13px}}`;

export function init(ctx){
  const { THREE, state, sound, bus, input } = ctx;
  const lerpAngle = ctx.helpers.lerpAngle;
  const COOLDOWN = 14, GAP = 2.2, MAX_BUBBLES = 2, HONK_GAP = 2.5;

  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const layer = document.createElement('div'); layer.id = 'voices'; layer.setAttribute('aria-live', 'polite'); document.body.appendChild(layer);

  // Shuffled deck per type and kind, so a line only repeats after the whole set has played.
  const decks = {};
  function nextLine(type, kind){
    const src = TYPES[type]?.[kind] || TYPES.plaza[kind]; const key = type + ':' + kind;
    let d = decks[key];
    if(!d || !d.length){ d = decks[key] = src.slice(); for(let i = d.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i + 1)); [d[i], d[j]] = [d[j], d[i]]; } }
    return d.pop();
  }

  // Each character gets a type from the zone it stands in when first seen, and a head height.
  const box3 = new THREE.Box3();
  function info(c){
    if(c.voice !== undefined) return c.voice;
    if(c.static || !c.g){ c.voice = null; return null; }
    let best = null, bd = 22;
    for(const z of ctx.zones){ const d = Math.hypot(z.x - c.x, z.z - c.z); if(d < bd){ bd = d; best = z; } }
    box3.setFromObject(c.g);
    const h = Math.max(0.6, box3.max.y - c.g.position.y);
    let type = best ? (ZONE_TYPE[best.id] || 'plaza') : 'plaza';
    if(type === 'fan' && h < 1.1) type = 'terrapin';
    c.voice = { type, head:h, last:-1e9, away:true, pitch:0.9 + Math.random()*0.2 };
    return c.voice;
  }

  const bubbles = [];          // { el, c, v, text, shown, t, life, turn, face }
  let clock = 0, lastSay = -1e9, lastHonk = -1e9, auto = true;

  function speak(c, text, kind){
    const v = info(c); if(!v || !text) return null;
    const old = bubbles.find(b => b.c === c); if(old) kill(old);
    while(bubbles.filter(q => !q.fading).length >= MAX_BUBBLES) kill(bubbles.find(q => !q.fading));
    const el = document.createElement('div'); el.className = 'vb';
    const name = document.createElement('b'); name.textContent = TYPES[v.type]?.name || 'Islander';
    const said = document.createElement('span'), rest = document.createElement('i');
    rest.textContent = text; el.append(name, said, rest); layer.appendChild(el);
    const R = state.reduced;
    const b = { el, said, rest, c, v, text, shown:R ? text.length : 0, t:0, life:1.8 + text.length*0.045, doneAt:null, fading:false, turn:0, blip:0, w:0, h:0 };
    if(R){ said.textContent = text; rest.textContent = ''; }
    bubbles.push(b);
    v.last = clock; lastSay = clock; v.away = false;
    if(!R && c.y <= 0.001) c.vy = 4.5;
    bus.emit('voice:say', { type:v.type, text, kind });
    return b;
  }
  function kill(b){ b.el.remove(); const i = bubbles.indexOf(b); if(i >= 0) bubbles.splice(i, 1); }

  // One babble blip. Pitch comes from the letter, so the same line always sounds the same.
  function blip(v, ch){
    if(!sound.on) return;
    const [base, spread, type] = TYPES[v.type]?.voice || TYPES.plaza.voice;
    const k = (ch.toLowerCase().charCodeAt(0) % 7) / 6;
    const f = base * v.pitch * (1 - spread/2 + spread*k);
    const vowel = 'aeiou'.includes(ch.toLowerCase());
    sound.tone(f, vowel ? 0.09 : 0.06, type, type === 'square' ? 0.025 : 0.05, f * (vowel ? 1.18 : 0.92));
  }

  function nearest(filter, x, z, r){
    let best = null, bd = r;
    for(const c of ctx.chars){ if(!filter(c)) continue; const d = Math.hypot(c.x - x, c.z - z); if(d < bd){ bd = d; best = c; } }
    return best;
  }

  const onIsland = m => m === 'drive' || m === 'walk';

  // Order 61: after the character sim (60) wrote c.yaw, decide who talks and turn speakers.
  ctx.onUpdate((dt, t, mode) => {
    clock += dt;
    if(!onIsland(mode) || !state.started){ for(const b of bubbles.slice()) kill(b); return; }
    const P = state.player, range = mode === 'walk' ? 5.5 : 8.5;
    for(const c of ctx.chars){
      const v = info(c); if(!v) continue;
      if(!v.away && Math.hypot(c.x - P.x, c.z - P.z) > range + 5) v.away = true;
    }
    if(auto && bubbles.filter(b => !b.fading).length < MAX_BUBBLES && clock - lastSay > GAP){
      const c = nearest(c => { const v = info(c); return v && v.away && clock - v.last > COOLDOWN && !bubbles.some(b => b.c === c); }, P.x, P.z, range);
      if(c) speak(c, nextLine(c.voice.type, 'lines'), 'near');
    }
    for(const b of bubbles.slice()){
      b.t += dt;
      // typewriter plus a blip on every other letter
      if(b.shown < b.text.length){
        const ms = (TYPES[b.v.type]?.voice || TYPES.plaza.voice)[3];
        const target = Math.min(b.text.length, Math.floor(b.t * 1000 / ms));
        while(b.shown < target){ const ch = b.text[b.shown++]; if(/[a-z0-9]/i.test(ch) && (b.blip++ % 2 === 0)) blip(b.v, ch); }
        b.said.textContent = b.text.slice(0, b.shown); b.rest.textContent = b.text.slice(b.shown);
      }
      if(b.shown >= b.text.length && b.doneAt == null) b.doneAt = b.t;
      // after the line has been read, the bubble fades and the character turns back
      if(b.doneAt != null && b.t - b.doneAt > b.life) b.fading = true;
      b.turn = b.fading ? b.turn - dt*2.5 : Math.min(1, b.turn + dt*5);
      if(b.fading && b.turn <= 0){ kill(b); continue; }
      const c = b.c; const face = Math.atan2(P.x - c.x, P.z - c.z);
      c.g.rotation.y = lerpAngle(c.yaw, face, b.turn);
    }
  }, 61);

  // Order 98: after the camera (90) has moved, place the bubbles on screen.
  const tmp = new THREE.Vector3();
  let hudRects = [], hudClock = 1;
  function readHud(){
    hudRects = [];
    const els = document.querySelectorAll('.hud, #game-root > *, #menu-root > *');
    for(const el of els){
      if(el.id === 'card' && !el.classList.contains('on')) continue;
      const r = el.getBoundingClientRect(); if(r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el); if(cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
      if(el.id === 'game-root') continue;
      hudRects.push([r.left - 8, r.top - 8, r.right + 8, r.bottom + 8]);
    }
  }
  const hits = (x0, y0, x1, y1) => hudRects.some(([a, b, c, d]) => x0 < c && x1 > a && y0 < d && y1 > b);
  ctx.onUpdate((dt, t, mode) => {
    if(!onIsland(mode) || !bubbles.length) return;
    hudClock += dt; if(hudClock > 0.3){ hudClock = 0; readHud(); }
    const cam = ctx.camera, W = innerWidth, H = innerHeight;
    for(const b of bubbles){
      if(!b.w){ b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
      const c = b.c; tmp.set(c.g.position.x, c.g.position.y + b.v.head + 0.3, c.g.position.z).project(cam);
      let ok = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
      const sx = (tmp.x + 1) / 2 * W, sy = (1 - tmp.y) / 2 * H;
      let x = Math.round(Math.max(8, Math.min(W - b.w - 8, sx - b.w/2))), y = Math.round(sy - b.h - 12), below = false;
      if(ok && (y < 8 || hits(x, y, x + b.w, y + b.h))){
        // flip under the character, and if that is covered too, keep quiet until it clears
        const y2 = Math.round(sy + 70);
        if(y2 + b.h < H - 8 && !hits(x, y2, x + b.w, y2 + b.h)){ y = y2; below = true; } else ok = false;
      }
      b.el.style.transform = `translate(${x}px,${y}px)`;
      b.el.classList.toggle('below', below);
      b.el.classList.toggle('on', ok && !b.fading);
    }
  }, 98);

  // A honk near someone gets a honk line, whatever their cooldown.
  input.on('honk', () => {
    if(state.mode !== 'drive' || !state.started || clock - lastHonk < HONK_GAP) return;
    const P = state.player;
    const c = nearest(c => !!info(c), P.x, P.z, 16);
    if(!c) return;
    lastHonk = clock;
    setTimeout(() => { if(onIsland(state.mode)) speak(c, nextLine(c.voice.type, 'honk'), 'honk'); }, 250);
  });

  const api = {
    /**
     * Make a character talk. For the tour and anything else scripted.
     *   target: a type ('team', 'brain', 'director', 'robot', 'student', 'terrapin', 'fan', 'tooth',
     *           'family', 'chef', 'now', 'mail', 'plaza'), a zone id ('blueberry', 'dock', ...), or a
     *           character object from ctx.chars.
     *   opts.text: say this instead of the next line from the deck.
     *   opts.kind: 'lines' (default) or 'honk', which deck to draw from.
     *   opts.near: {x, z} to pick the character of that type nearest this point (default the player).
     * Returns { type, text } or null (not on the island, or nobody of that type).
     */
    say(target, opts = {}){
      if(!onIsland(state.mode)) return null;
      let c = null;
      if(target && typeof target === 'object' && target.g) c = target;
      else {
        const type = TYPES[target] ? target : (ZONE_TYPE[target] || null);
        if(!type) return null;
        const at = opts.near || state.player;
        c = nearest(q => { const v = info(q); return v && (v.type === type || (target === 'umd' && v.type === 'terrapin')); }, at.x, at.z, Infinity);
      }
      if(!c || !info(c)) return null;
      const text = opts.text || nextLine(c.voice.type, opts.kind === 'honk' ? 'honk' : 'lines');
      const b = speak(c, text, 'say');
      return b ? { type:b.v.type, text } : null;
    },
    types: () => Object.keys(TYPES),
    lines: type => TYPES[type] ? { lines:TYPES[type].lines.slice(), honk:TYPES[type].honk.slice() } : null,
    active: () => bubbles.map(b => ({ type:b.v.type, text:b.text, shown:b.el.classList.contains('on') })),
    setAuto(on){ auto = !!on; },       // the tour can pause walk-up chatter while its guide talks
    clear(){ for(const b of bubbles.slice()) kill(b); },
    census(){ const n = {}; for(const c of ctx.chars){ const v = info(c); if(v) n[v.type] = (n[v.type] || 0) + 1; } return n; },
  };
  ctx.expose('voices', api);
  return api;
}

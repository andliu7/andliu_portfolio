// Capture: the site's real screenshots and the island finale still (SITE-PLAN.md 2.6, 2.7, 9).
//
//   node scripts/capture.mjs                     everything below
//   node scripts/capture.mjs work island         only some steps (work, island, credits, pending)
//   node scripts/capture.mjs work --trainer=live   also report whether the live trainer route is up
//
// Writes, and nothing else:
//   public/images/work/<name>.webp (1600x1000) and <name>-800.webp (800x500), WebP q=75,
//     each cropped to its subject (see shoot) rather than a raw browser window
//   public/media/island/s3-{1280,2560,3840}.webp, under 140 / 380 / 650 KB
//   public/images/photo/credits.json, credit and creditUrl only, for entries with an unsplashId
//   _ref/pending/second-brain-grid-1440.png (never public/: Andrew approves it himself, plan 2.7)
//
// Machine safety: ONE headless Chrome (the installed one, through puppeteer-core) and one tiny
// node static server, both closed in a finally block; the Chrome process is killed by pid if a
// polite close fails. Nothing here spawns python or any other server.

import { createServer } from 'node:http';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const projects = join(root, '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BB_LIVE = 'https://andliu7.github.io/blueberry/';
const PORT = 4317;
const LOCAL = `http://127.0.0.1:${PORT}`;

const args = process.argv.slice(2);
const steps = args.filter(a => !a.startsWith('--'));
const want = step => steps.length === 0 || steps.includes(step);
const trainerLive = args.includes('--trainer=live');

const workDir = join(root, 'public', 'images', 'work');
const islandDir = join(root, 'public', 'media', 'island');

// Local sources, served read only under a prefix each. island/ is read, never written.
const MOUNTS = {
  '/island/': join(root, 'island'),
  '/mt/': join(projects, 'mechanism_trainer', 'dist'),
  '/ff/': join(projects, 'ff_technical_instructions', 'repo2'),
};
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.pdf': 'application/pdf', '.txt': 'text/plain',
};

function startServer() {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, LOCAL).pathname);
    const prefix = Object.keys(MOUNTS).find(p => path.startsWith(p));
    if (!prefix) { res.writeHead(404).end(); return; }
    const base = MOUNTS[prefix];
    let file = normalize(join(base, path.slice(prefix.length)));
    // Refuse anything that climbs out of its mount.
    if (!file.startsWith(base + sep) && file !== base) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  return new Promise(resolve => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const kb = bytes => `${Math.round(bytes / 1024)} KB`;

// Every work image is art directed, not a raw window: each shot names its SUBJECT as a box in
// page coordinates (worked out from the page's own elements, so a layout change moves the crop
// with it), the box is widened to 16:10 about its centre, the page is scrolled so the box sits
// inside the viewport, and the viewport shot at DSF 2 is cut down to that box. Fixed overlays
// outside the box never show, and nothing is cut mid-row because each box ends on a real edge.
const RATIO = 16 / 10;
const DSF = 2;

function fitRatio({ x, y, w, h }) {
  if (w / h < RATIO) { const nw = h * RATIO; x -= (nw - w) / 2; w = nw; }
  else { const nh = w / RATIO; y -= (nh - h) / 2; h = nh; }
  return { x, y, w, h };
}

// Opens `url` at `viewport`, runs `prepare` (hide a decoration, press a control), asks the page
// for the subject box with `box` (runs in the browser), and returns the cropped PNG.
async function shoot(page, url, { viewport = { width: 1440, height: 900 }, wait = 2500, prepare, box }) {
  await page.setViewport({ ...viewport, deviceScaleFactor: DSF });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(wait);
  if (prepare) await prepare(page);
  const raw = await page.evaluate(box);
  if (!raw) throw new Error(`no subject box on ${url}`);
  const b = fitRatio(raw);
  if (b.h > viewport.height || b.w > viewport.width) throw new Error(`subject box on ${url} is larger than the viewport: ${JSON.stringify(b)}`);
  const top = Math.max(0, Math.round(b.y - (viewport.height - b.h) / 2));
  await page.evaluate(t => window.scrollTo(0, t), top);
  await sleep(800);
  const scrollY = await page.evaluate(() => window.scrollY);
  const png = Buffer.from(await page.screenshot({ type: 'png' }));
  const left = Math.max(0, Math.round(b.x * DSF));
  const cut = {
    left,
    top: Math.max(0, Math.round((b.y - scrollY) * DSF)),
    width: Math.min(Math.round(b.w * DSF), viewport.width * DSF - left),
    height: Math.round(b.h * DSF),
  };
  return sharp(png).extract(cut).png().toBuffer();
}

// Both outputs are clean downscales of the cropped DSF 2 master. `grade` is an optional mild
// contrast lift for a shot whose UI is grey on navy.
async function writeWork(name, png, { grade = false } = {}) {
  mkdirSync(workDir, { recursive: true });
  for (const [w, suffix] of [[1600, ''], [800, '-800']]) {
    const out = join(workDir, `${name}${suffix}.webp`);
    let img = sharp(png).resize(w, w * 10 / 16, { fit: 'cover', position: 'centre' });
    if (grade) img = img.linear(1.14, -8);
    await img.webp({ quality: 75 }).toFile(out);
    console.log(`  wrote images/work/${name}${suffix}.webp (${w}px, ${kb(statSync(out).size)})`);
  }
}

// The live trainer is usable when the hash route stuck and the page shows real content, not a
// sign-in wall or an empty shell. Only reported now (--trainer=live): the live route is a unit
// list, and the spread's copy talks about the connected map, which the local build draws.
async function trainerUsable(page) {
  return page.evaluate(() => {
    const text = document.body.innerText || '';
    const gated = /already have an account|create an account/i.test(text);
    return location.hash.includes('trainer') && text.trim().length > 80 && !gated;
  });
}

// Subject boxes. Each runs inside the page and returns { x, y, w, h } in document pixels.

// Home: the hero alone (wordmark, headline, call to action and the berry), boxed symmetric about
// the page centre so the berry on the right is inside it, starting under the 56px header strip.
function boxHome() {
  const h1 = document.querySelector('h1');
  const hero = h1?.closest('section');
  if (!h1 || !hero) return null;
  const r = h1.getBoundingClientRect();
  const s = hero.getBoundingClientRect();
  const x = r.left - 50;
  const w = innerWidth - 2 * x;
  return { x, y: s.top + scrollY + 4, w, h: w / 1.6 };
}

// Lessons: the course grid (twelve sections, each on its own photograph), down to the end of its
// third row of cards, so the shot never shows the lesson video, which is still a placeholder.
function boxLessons() {
  const head = [...document.querySelectorAll('h3')].find(h => h.textContent.trim().toLowerCase() === 'the course');
  const sec = head?.closest('section');
  if (!sec) return null;
  const cards = [...sec.querySelectorAll('h3')].filter(h => h !== head).map(h => h.closest('a, button') ?? h.parentElement);
  if (cards.length < 9) return null;
  const s = sec.getBoundingClientRect();
  const top = s.top + scrollY - 16;
  const h = Math.max(...cards.slice(0, 9).map(c => c.getBoundingClientRect().bottom)) + scrollY + 12 - top;
  const w = h * 1.6;
  return { x: s.left + s.width / 2 - w / 2, y: top, w, h };
}

// Pathway: the unit header, the berry at START and the trail down to the sixth stop, centred on
// the main column, ending under that stop's disc so no row is cut.
function boxPath() {
  const start = document.querySelector('.path-start');
  const labels = [...document.querySelectorAll('.path-label__text')];
  const main = document.querySelector('main');
  if (!start || labels.length < 6 || !main) return null;
  const st = start.getBoundingClientRect();
  const sixth = labels[5].getBoundingClientRect();
  const m = main.getBoundingClientRect();
  const top = st.top + scrollY - 96;
  const h = sixth.bottom + scrollY + 42 - top;
  const w = h * 1.6;
  return { x: m.left + m.width / 2 - w / 2, y: top, w, h };
}

// Trainer: the map's own frame (title bar, filters and the graph), zoomed out one step first so
// every node sits inside the frame instead of running off its edges.
async function zoomTrainer(page) {
  const out = await page.$('button[aria-label="Zoom out"]');
  if (out) { await out.click(); await sleep(900); }
}
function boxTrainer() {
  const title = [...document.querySelectorAll('h1')].find(h => h.textContent.trim() === 'Carbonyl reactions');
  let el = title;
  while (el && el.getBoundingClientRect().height < 600) el = el.parentElement;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left - 8, y: r.top + scrollY - 6, w: r.width + 16, h: r.height + 12 };
}

// Focus Family Guide: the cover page lying on its grid paper, from the document bar to the end of
// the cover. Its WebGL fire canvases (they freeze into magenta blobs in a still) and the fixed
// floating action button are hidden for the shot; the page itself is untouched.
async function calmGuide(page) {
  await page.addStyleTag({ content: '.flame, .fab { display: none !important; }' });
  await sleep(300);
}
function boxGuide() {
  const bar = document.querySelector('.docbar');
  const cover = document.querySelector('section.cover');
  if (!bar || !cover) return null;
  const b = bar.getBoundingClientRect();
  const c = cover.getBoundingClientRect();
  const top = b.top + scrollY - 16;
  const h = c.bottom + scrollY + 16 - top;
  const w = h * 1.6;
  return { x: c.left + c.width / 2 - w / 2, y: top, w, h };
}

async function captureWork(browser) {
  console.log('work: Blueberry and project screens');
  const page = await browser.newPage();
  // Reduced motion so entrance animations are finished when the shot is taken.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  // The game routes redirect a fresh profile to onboarding. Seed the state a student has right
  // after finishing it (the one open course, nothing played), the same shape Blueberry's
  // src/game/app/progress.ts stores, so the shots show the real pathway.
  await page.evaluateOnNewDocument(() => {
    if (location.hostname !== 'andliu7.github.io') return;
    try {
      localStorage.setItem('blueberry.progress.v2', JSON.stringify({
        course: 'orgo_2', startTopics: [], lessons: {}, attemptedProblems: [],
        onboardingDone: true, displayName: null, journal: [],
      }));
    } catch { /* storage blocked: the shot shows onboarding, which the review will catch */ }
  });
  try {
    await writeWork('blueberry-home', await shoot(page, BB_LIVE, { box: boxHome }));
    await writeWork('blueberry-path', await shoot(page, `${BB_LIVE}#/app/pathway`, { viewport: { width: 1280, height: 800 }, box: boxPath }), { grade: true });
    await writeWork('blueberry-lesson', await shoot(page, `${BB_LIVE}#/lessons`, { box: boxLessons }));

    if (trainerLive) {
      await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: DSF });
      await page.goto(`${BB_LIVE}#/app/trainer`, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(3500);
      console.log(`  trainer: live route ${(await trainerUsable(page)) ? 'is up' : 'is gated or blank'}, shooting the local map anyway`);
    }
    await writeWork('mechanism-trainer', await shoot(page, `${LOCAL}/mt/index.html`, { wait: 3000, prepare: zoomTrainer, box: boxTrainer }));

    await writeWork('focus-family-guide', await shoot(page, `${LOCAL}/ff/index.html`, { prepare: calmGuide, box: boxGuide }));
  } finally {
    await page.close();
  }
}

// The island S3 still: the overview preset (the fixed 3/4 view) under the island's own golden
// hour light, HUD hidden, 1920x1080 at DSF 2.
async function captureIsland(browser) {
  console.log('island: S3 still');
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  try {
    await page.goto(`${LOCAL}/island/index.html`, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForFunction('window.__island && window.__island.ready', { timeout: 90000 });
    const failures = await page.evaluate('window.__island.failures');
    if (failures.length) console.log('  island module failures:', JSON.stringify(failures));
    await page.evaluate('window.__island.start(false)');
    await sleep(1500);
    await page.evaluate(() => {
      const cam = window.__island.ctx.modules.camera;
      cam.setMode('overview');
      // Pulled all the way back (the island's own zoom limit) so the still reads as the island.
      window.__island.camera?.zoom?.(1.7);
      cam.snap();
      // Only the 3D stage in the still: every overlay (HUD, start dock, toasts) is hidden.
      const s = document.createElement('style');
      s.textContent = 'body > *:not(#stage){visibility:hidden !important}';
      document.head.appendChild(s);
    });
    // Software rendering at 4K can take seconds a frame, so wait for the rig to arrive rather
    // than for a fixed time: overview is 50 units out, times the zoom.
    await page.waitForFunction(() => (window.__island.camera?.info?.().want ?? 0) > 80, { timeout: 120000, polling: 500 });
    // Then a few seconds of real frames so the rendered picture has caught up with the rig.
    await page.waitForFunction(() => window.__island.fps() >= 5, { timeout: 120000, polling: 1000 }).catch(() => {});
    await sleep(3000);
    const info = await page.evaluate(() => ({ fps: window.__island.fps(), want: window.__island.camera.info().want, dist: window.__island.camera.info().dist }));
    console.log('  camera:', JSON.stringify(info));
    await page.evaluate('window.__island.screenshotReady()');
    const png = Buffer.from(await page.screenshot({ type: 'png' }));
    mkdirSync(islandDir, { recursive: true });
    // Budgets from plan 9; quality steps down from 75 until each size fits.
    for (const [w, budget] of [[3840, 650], [2560, 380], [1280, 140]]) {
      const out = join(islandDir, `s3-${w}.webp`);
      let q = 75, buf;
      for (; q >= 40; q -= 5) {
        buf = await sharp(png).resize(w, w * 9 / 16).webp({ quality: q }).toBuffer();
        if (buf.length < budget * 1024) break;
      }
      if (buf.length >= budget * 1024) throw new Error(`s3-${w}.webp is ${kb(buf.length)}, over ${budget} KB even at q=40`);
      writeFileSync(out, buf);
      console.log(`  wrote media/island/s3-${w}.webp (q=${q}, ${kb(buf.length)}, budget ${budget} KB)`);
    }
  } finally {
    await page.close();
  }
}

// Credits for photos with a known Unsplash id, read from the photo's own page. Unknown ids and
// pages that do not resolve keep "Unsplash".
async function captureCredits(browser) {
  console.log('credits: Unsplash photographers');
  const file = join(root, 'public', 'images', 'photo', 'credits.json');
  const list = JSON.parse(readFileSync(file, 'utf8'));
  const page = await browser.newPage();
  try {
    for (const entry of list) {
      if (!entry.unsplashId) continue;
      const res = await page.goto(`https://unsplash.com/photos/${entry.unsplashId}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
      await sleep(2000);
      const who = res && res.ok() ? await page.evaluate(() => {
        const a = [...document.querySelectorAll('a[href^="/@"]')].find(x => x.textContent.trim());
        return a ? { name: a.textContent.trim(), href: new URL(a.getAttribute('href'), location.origin).href } : null;
      }) : null;
      if (who) {
        entry.credit = `Photo by ${who.name} on Unsplash`;
        entry.creditUrl = who.href;
        console.log(`  ${entry.file}: ${entry.credit}`);
      } else {
        console.log(`  ${entry.file}: no photographer found, kept "${entry.credit}"`);
      }
    }
  } finally {
    await page.close();
  }
  // One entry per line, as the file was written by hand.
  writeFileSync(file, `[\n${list.map(e => `  ${JSON.stringify(e)}`).join(',\n')}\n]\n`);
}

function copyPending() {
  const from = join(projects, 'second-brain', 'rounds', 'P2b', 'crit3', 'grid-1440.png');
  const to = join(root, '_ref', 'pending', 'second-brain-grid-1440.png');
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log('pending: copied second-brain grid-1440.png to _ref/pending/ (not public/)');
}

if (want('pending')) copyPending();

if (want('work') || want('island') || want('credits')) {
  const server = await startServer();
  const profile = mkdtempSync(join(tmpdir(), 'andliu-capture-'));
  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      userDataDir: profile,
      // The real GPU through ANGLE: software WebGL renders the island at 4K far below 1 fps.
      args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio'],
    });
    if (want('work')) await captureWork(browser);
    if (want('island')) await captureIsland(browser);
    if (want('credits')) await captureCredits(browser);
  } finally {
    const pid = browser?.process()?.pid;
    await browser?.close().catch(() => {});
    if (pid) { try { process.kill(pid); } catch { /* already gone */ } }
    await new Promise(r => server.close(r));
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}

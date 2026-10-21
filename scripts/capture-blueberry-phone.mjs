// Capture: Blueberry phone screens for the portfolio's phone-screens gallery.
//
//   node scripts/capture-blueberry-phone.mjs                 every shot below
//   node scripts/capture-blueberry-phone.mjs path cards      only some shots, by name
//   node scripts/capture-blueberry-phone.mjs --out=<dir>     write somewhere else (a dry look)
//
// Writes, and nothing else: public/work/blueberry-phone/<name>.webp, each one phone viewport
// (390x844 CSS px at DSF 2, so 780x1688), WebP q=72. Separate from scripts/capture.mjs on
// purpose: that script rewrites the 16:10 work stills, this one only ever touches this folder.
//
// Shoots the LIVE site, so rerunning it picks up whatever Blueberry has shipped since.
// Machine safety: one headless Chrome (the installed one, through puppeteer-core), closed in a
// finally block and killed by pid if a polite close fails.

import { mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BB_LIVE = 'https://andliu7.github.io/blueberry/';
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const args = process.argv.slice(2);
const outArg = args.find(a => a.startsWith('--out='));
const outDir = outArg ? outArg.slice(6) : join(root, 'public', 'work', 'blueberry-phone');
const only = args.filter(a => !a.startsWith('--'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const kb = bytes => `${Math.round(bytes / 1024)} KB`;

// Each shot: a file name, the hash route, and optionally `prepare` (runs with the page after it
// settles: scroll to a subject, open a control). Order is the gallery's suggested order.
// Picked from a dry run of 16 routes (2026-10-20). Left out, and why: #/deck/grignard (a blank
// card face before the flip), #/app/me and #/app/courses (empty stats, a list of "Soon" rows),
// #/app/trainer (a plain unit list). Some routes redirect: #/lessons lands on #/learn,
// #/calendar on #/schedule, #/tutoring on #/schedule?view=hours.
const SHOTS = [
  { name: 'site-home', hash: '' },
  { name: 'site-learn', hash: '#/learn' },
  { name: 'site-lesson-aldol', hash: '#/lessons/enolate/aldol-addition' },
  { name: 'site-review', hash: '#/study-decks' },
  { name: 'site-schedule', hash: '#/schedule' },
  { name: 'site-tutoring', hash: '#/schedule?view=hours' },
  { name: 'game-path', hash: '#/app/pathway' },
  { name: 'game-lesson', hash: '#/app/lesson/u1-kvt' },
  { name: 'game-cards', hash: '#/app/cards' },
  { name: 'game-feed', hash: '#/app/feed' },
  { name: 'game-periodic', hash: '#/app/periodic' },
  { name: 'game-search', hash: '#/app/search' },
];

async function shoot(page, shot) {
  // A fresh document each time (about:blank first) so a hash change is a real load, not an
  // in-app navigation that could keep the last screen's scroll or sheet.
  await page.goto('about:blank');
  await page.goto(BB_LIVE + shot.hash, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  // The app's loader fades out on its own; wait for the body to carry real content, then let
  // entrance motion finish.
  await page.waitForFunction(() => (document.body.innerText || '').trim().length > 40, { timeout: 20000 }).catch(() => {});
  await sleep(2500);
  if (shot.prepare) { await shot.prepare(page); await sleep(800); }
  const png = Buffer.from(await page.screenshot({ type: 'png' }));
  const out = join(outDir, `${shot.name}.webp`);
  await sharp(png).webp({ quality: 72 }).toFile(out);
  const where = await page.evaluate(() => location.hash);
  console.log(`  ${shot.name}.webp  ${kb(statSync(out).size)}  (landed on "${where}")`);
}

mkdirSync(outDir, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'andliu-bbphone-'));
let browser = null;
try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: profile,
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.setUserAgent({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  // Reduced motion so entrance animations are finished when the shot is taken.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  // The game routes send a fresh profile to onboarding. Seed the state a student has right after
  // finishing it, the same shape scripts/capture.mjs seeds (Blueberry's src/game/app/progress.ts).
  await page.evaluateOnNewDocument(() => {
    if (location.hostname !== 'andliu7.github.io') return;
    try {
      localStorage.setItem('blueberry.progress.v2', JSON.stringify({
        course: 'orgo_2', startTopics: [], lessons: {}, attemptedProblems: [],
        onboardingDone: true, displayName: null, journal: [],
      }));
    } catch { /* storage blocked: the shot shows onboarding */ }
  });
  console.log(`blueberry phone screens -> ${outDir}`);
  for (const shot of SHOTS) {
    if (only.length && !only.includes(shot.name)) continue;
    try { await shoot(page, shot); }
    catch (e) { console.log(`  ${shot.name}: FAILED ${e.message}`); }
  }
} finally {
  const pid = browser?.process()?.pid;
  await browser?.close().catch(() => {});
  if (pid) { try { process.kill(pid); } catch { /* already gone */ } }
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}

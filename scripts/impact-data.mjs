// Derives every number in the Impact section (SITE-PLAN.md 4.6) from disk and git, and writes
// lib/impact.json. Nothing here is estimated: a series whose source is missing is left out and a
// line says so. Runs on Andrew's machine only (the sibling repos are not on GitHub Pages), and is
// NOT part of `npm run build`.
//
//   node scripts/impact-data.mjs           regenerate lib/impact.json
//   node scripts/impact-data.mjs --check   regenerate in memory; exit 1 if any number differs
//
// Privacy: from the memory files only the heading dates and kinds are read into the output.
// Titles, bodies and tags never are, and before writing, the script checks that no memory title
// appears anywhere in the serialised JSON. Source strings are relative to Projects/.

import { createReadStream, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '..');
const projects = resolve(site, '..');
const outPath = join(site, 'lib/impact.json');
const ts = createRequire(import.meta.url)('typescript');

const BRAIN = join(projects, 'second-brain/second-brain');
const BB = join(projects, 'grignard/grignard-app-source');
const TRAINER = join(projects, 'mechanism_trainer');

const skip = (id, why) => console.log(`omitted ${id}: ${why}`);

// ---------- small helpers ----------

/** Dates of every commit, oldest first, or null when the repo is missing. */
function commitDates(repo) {
  if (!existsSync(repo)) return null;
  try {
    const out = execFileSync('git', ['-C', repo, 'log', '--format=%ad', '--date=short'], { encoding: 'utf8' });
    return out.split('\n').map(s => s.trim()).filter(Boolean).sort();
  } catch {
    return null;
  }
}

/** Running total by day: one point per distinct date. */
function cumulative(dates) {
  const perDay = new Map();
  for (const d of dates) perDay.set(d, (perDay.get(d) ?? 0) + 1);
  let total = 0;
  return [...perDay.keys()].sort().map(x => ({ x, y: (total += perDay.get(x)) }));
}

const DAY = 86400000;
const toMs = d => Date.parse(`${d}T00:00:00Z`);
const toDate = ms => new Date(ms).toISOString().slice(0, 10);
/** The Monday on or before a date (ISO weeks start on Monday). */
const monday = d => { const ms = toMs(d); const dow = (new Date(ms).getUTCDay() + 6) % 7; return toDate(ms - dow * DAY); };

/** Commits per week, every week from the first to the last, empty weeks included as 0. */
function weekly(dates) {
  const counts = new Map();
  for (const d of dates) { const w = monday(d); counts.set(w, (counts.get(w) ?? 0) + 1); }
  const points = [];
  for (let ms = toMs(monday(dates[0])); ms <= toMs(monday(dates[dates.length - 1])); ms += 7 * DAY) {
    const x = toDate(ms);
    points.push({ x, y: counts.get(x) ?? 0 });
  }
  return points;
}

/** Every file under dir whose name matches, never descending into node_modules or dot folders. */
function walk(dir, match, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, match, found);
    else if (match(entry.name)) found.push(full);
  }
  return found;
}

/**
 * Loads a TypeScript module from Blueberry's source by transpiling it to CommonJS with the
 * installed compiler and evaluating it. Relative imports and the "@/" alias (which means src/)
 * are resolved the same way; `import type` lines disappear in the transpile.
 */
function loadTs(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: file,
  });
  const requireTs = spec => {
    let base;
    if (spec.startsWith('@/')) base = join(BB, 'src', spec.slice(2));
    else if (spec.startsWith('.')) base = resolve(dirname(file), spec);
    else throw new Error(`unexpected import ${spec} in ${file}`);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')];
    const hit = candidates.find(c => existsSync(c) && statSync(c).isFile());
    if (!hit) throw new Error(`cannot resolve ${spec} from ${file}`);
    if (hit.endsWith('.json')) return JSON.parse(readFileSync(hit, 'utf8'));
    return loadTs(hit, cache);
  };
  new Function('exports', 'require', 'module', outputText)(module.exports, requireTs, module);
  return module.exports;
}

// ---------- the panels ----------

async function brainPanel(titles) {
  const series = [];

  // Memories: only the "## [YYYY-MM-DD] kind |" headings. The title after the bar is collected
  // into `titles` for the privacy check and goes nowhere else.
  const memDir = join(BRAIN, 'memories');
  if (existsSync(memDir)) {
    const heading = /^## \[(\d{4}-\d{2}-\d{2})\] ([a-z]+) \|(.*)$/;
    const dates = [];
    const kinds = new Map();
    for (const name of readdirSync(memDir).filter(n => n.endsWith('.md')).sort()) {
      for (const line of readFileSync(join(memDir, name), 'utf8').split(/\r?\n/)) {
        const m = heading.exec(line);
        if (!m) continue;
        dates.push(m[1]);
        kinds.set(m[2], (kinds.get(m[2]) ?? 0) + 1);
        titles.push(m[3].replace(/\.\.\.$/, '').trim());
      }
    }
    if (dates.length) {
      const src = 'second-brain/second-brain/memories/*.md: every "## [date] kind |" heading; dates only';
      series.push({ id: 'brain.memories', kind: 'line', unit: 'memories', dim: 'date', points: cumulative(dates.sort()), source: `${src}, running total by day` });
      const order = ['decision', 'pref', 'gotcha', 'fact'];
      const keys = [...order.filter(k => kinds.has(k)), ...[...kinds.keys()].filter(k => !order.includes(k)).sort()];
      series.push({ id: 'brain.kinds', kind: 'bar', unit: 'memories', dim: 'kind', points: keys.map(x => ({ x, y: kinds.get(x) })), source: 'second-brain/second-brain/memories/*.md: the same headings, counted by their kind field' });
    } else { skip('brain.memories', 'no memory headings'); skip('brain.kinds', 'no memory headings'); }
  } else { skip('brain.memories', 'no memories folder'); skip('brain.kinds', 'no memories folder'); }

  // The bench.py hard suite: tokens per arm, with correct out of n.
  const historyPath = join(BRAIN, 'bench/results-history-summary.json');
  const hard = existsSync(historyPath)
    ? JSON.parse(readFileSync(historyPath, 'utf8')).studies?.find(s => s.study === 'bench.py hard suite')
    : null;
  if (hard?.arms) {
    const points = Object.entries(hard.arms).map(([x, a]) => ({ x, y: a.tokens, y2: a.correct, n: a.n }));
    series.push({ id: 'brain.retrieval', kind: 'bar', unit: 'tokens', dim: 'arm', fields: { y: 'tokens', y2: 'correct' }, points, source: 'second-brain/second-brain/bench/results-history-summary.json, study "bench.py hard suite": tokens, correct and n per arm' });
  } else skip('brain.retrieval', 'no "bench.py hard suite" study in results-history-summary.json');

  // Lookup speed: BRAIN, GREP and GLOB, as measured, even where BRAIN is slower.
  const speedPath = join(BRAIN, 'bench/results-speed-summary.json');
  const arms = existsSync(speedPath) ? JSON.parse(readFileSync(speedPath, 'utf8')).arms : null;
  const speedArms = ['BRAIN', 'GREP', 'GLOB'].filter(a => arms?.[a]);
  if (speedArms.length) {
    series.push({ id: 'brain.latency', kind: 'bar', unit: 'ms', dim: 'arm', fields: { y: 'median', y2: 'p90' }, points: speedArms.map(x => ({ x, y: arms[x].median_ms, y2: arms[x].p90_ms })), source: 'second-brain/second-brain/bench/results-speed-summary.json, arms BRAIN, GREP, GLOB: median_ms and p90_ms' });
    series.push({ id: 'brain.toRead', kind: 'bar', unit: 'tokens', dim: 'arm', scale: 'log', points: speedArms.map(x => ({ x, y: arms[x].median_tokens_to_read })), source: 'second-brain/second-brain/bench/results-speed-summary.json, arms BRAIN, GREP, GLOB: median_tokens_to_read' });
  } else { skip('brain.latency', 'no results-speed-summary.json arms'); skip('brain.toRead', 'no results-speed-summary.json arms'); }

  // index.tsv is about 24 MB: streamed line by line, never loaded whole. The first column is an
  // absolute path, so only the count of distinct values leaves this function.
  const indexPath = join(BRAIN, 'index.tsv');
  if (existsSync(indexPath)) {
    let rows = 0;
    let declared = null;
    const paths = new Set();
    const lines = createInterface({ input: createReadStream(indexPath, 'utf8'), crlfDelay: Infinity });
    for await (const line of lines) {
      if (line.startsWith('#')) { declared = Number(line.split('\t')[3]); continue; }
      if (!line) continue;
      rows++;
      paths.add(line.slice(0, line.indexOf('\t')));
    }
    if (declared !== null && declared !== rows) console.log(`note: index.tsv header says ${declared} rows, ${rows} counted; using the count`);
    series.push({ id: 'brain.rows', kind: 'stat', unit: 'rows', value: rows, source: 'second-brain/second-brain/index.tsv: data rows after the header, streamed' });
    series.push({ id: 'brain.files', kind: 'stat', unit: 'files', value: paths.size, source: 'second-brain/second-brain/index.tsv: distinct values in the first (path) column' });
  } else { skip('brain.rows', 'no index.tsv'); skip('brain.files', 'no index.tsv'); }

  const wikiDir = join(BRAIN, 'wiki/pages');
  if (existsSync(wikiDir)) {
    series.push({ id: 'brain.wiki', kind: 'stat', unit: 'pages', value: readdirSync(wikiDir).filter(n => n.endsWith('.md')).length, source: 'second-brain/second-brain/wiki/pages/*.md: file count' });
  } else skip('brain.wiki', 'no wiki/pages folder');

  const dates = commitDates(join(projects, 'second-brain'));
  if (dates?.length) {
    series.push({ id: 'brain.commits', kind: 'bar', unit: 'commits', dim: 'week', points: weekly(dates), source: 'git -C second-brain log --format=%ad --date=short, counted per week starting Monday' });
  } else skip('brain.commits', 'no git history for second-brain');

  return { id: 'brain', series };
}

function blueberryPanel() {
  const series = [];
  const dates = commitDates(BB);
  if (dates?.length) {
    series.push({ id: 'bb.commits', kind: 'line', unit: 'commits', dim: 'date', points: cumulative(dates), source: 'git -C grignard/grignard-app-source log --format=%ad --date=short, running total by day' });
  } else skip('bb.commits', 'no git history for grignard-app-source');

  // Content, each count with the rule that produced it written into the source string.
  const points = [];
  const rules = [];
  const decksFile = join(BB, 'src/data/decks/index.ts');
  if (existsSync(decksFile)) {
    const { DECKS } = loadTs(decksFile);
    points.push({ x: 'decks', y: DECKS.length });
    // Distinct by question text: the "every carbonyl reaction" deck repeats the other carbonyl
    // decks' cards, so a plain sum would count those cards twice.
    const distinct = new Set(DECKS.flatMap(d => (Array.isArray(d.questions) ? d.questions : []).map(q => q.q)));
    points.push({ x: 'questions', y: distinct.size });
    rules.push('decks = DECKS in decks/index.ts, carbonyls expanded; questions = distinct q text across them');
  } else skip('bb.content decks', 'no src/data/decks/index.ts');
  const lessonsFile = join(BB, 'src/data/lessonTopics.ts');
  if (existsSync(lessonsFile)) {
    points.push({ x: 'lessons', y: loadTs(lessonsFile).LESSON_TOPICS.length });
    rules.push('lessons = LESSON_TOPICS');
  } else skip('bb.content lessons', 'no src/data/lessonTopics.ts');
  const reactionsFile = join(BB, 'src/data/reactions.ts');
  if (existsSync(reactionsFile)) {
    points.push({ x: 'reactions', y: loadTs(reactionsFile).REACTIONS.length });
    rules.push('reactions = REACTIONS in reactions.ts');
  } else skip('bb.content reactions', 'no src/data/reactions.ts');
  if (points.length) {
    series.push({ id: 'bb.content', kind: 'bar', unit: 'items', dim: 'item', points, source: `grignard/grignard-app-source/src/data: ${rules.join('; ')}` });
  }

  const pkgDir = join(BB, 'packages');
  if (existsSync(pkgDir)) {
    const count = readdirSync(pkgDir).filter(n => existsSync(join(pkgDir, n, 'package.json'))).length;
    series.push({ id: 'bb.packages', kind: 'stat', unit: 'packages', value: count, source: 'grignard/grignard-app-source/packages/*/package.json: count' });
  } else skip('bb.packages', 'no packages folder');

  if (existsSync(join(BB, 'src'))) {
    const isTest = name => /\.test\./.test(name);
    const tests = [...walk(join(BB, 'src'), isTest), ...walk(pkgDir, isTest)].length;
    series.push({ id: 'bb.tests', kind: 'stat', unit: 'files', value: tests, source: 'grignard/grignard-app-source: *.test.* files under src/ and packages/, node_modules excluded' });
  } else skip('bb.tests', 'no src folder');

  if (dates?.length) {
    series.push({ id: 'bb.commitsTotal', kind: 'stat', unit: 'commits', value: dates.length, source: 'git -C grignard/grignard-app-source log: commit count' });
  } else skip('bb.commitsTotal', 'no git history');

  return { id: 'blueberry', series };
}

function trainerPanel() {
  const dates = commitDates(TRAINER);
  if (!dates?.length) {
    skip('trainer.*', 'no git history for mechanism_trainer');
    return { id: 'trainer', series: [] };
  }
  const span = Math.round((toMs(dates[dates.length - 1]) - toMs(dates[0])) / DAY);
  return {
    id: 'trainer',
    series: [
      { id: 'trainer.commits', kind: 'line', unit: 'commits', dim: 'date', points: cumulative(dates), source: 'git -C mechanism_trainer log --format=%ad --date=short, running total by day' },
      { id: 'trainer.commitsTotal', kind: 'stat', unit: 'commits', value: dates.length, source: 'git -C mechanism_trainer log: commit count' },
      { id: 'trainer.span', kind: 'stat', unit: 'days', value: span, source: `git -C mechanism_trainer log: days from the first commit (${dates[0]}) to the last (${dates[dates.length - 1]})` },
    ],
  };
}

// ---------- build, guard, write or check ----------

async function build() {
  const titles = [];
  const panels = [await brainPanel(titles), blueberryPanel(), trainerPanel()].filter(p => p.series.length);
  const data = { generated: new Date().toISOString(), panels };
  const json = `${JSON.stringify(data, null, 1)}\n`;

  // Guards: no memory title, no absolute path, no long string, under 40 KB.
  for (const title of titles) {
    if (title && json.includes(title)) throw new Error('a memory title appears in the output; refusing to write');
  }
  if (/[A-Za-z]:[\\/]/.test(json) || json.includes('Users')) throw new Error('an absolute path appears in the output');
  const strings = [];
  JSON.parse(json, (_k, v) => { if (typeof v === 'string') strings.push(v); return v; });
  const long = strings.find(s => s.length >= 200);
  if (long) throw new Error(`a string is 200 characters or longer: ${long.slice(0, 60)}`);
  if (Buffer.byteLength(json) > 40 * 1024) throw new Error('lib/impact.json would be over 40 KB');
  return { data, json };
}

const { data, json } = await build();

if (process.argv.includes('--check')) {
  if (!existsSync(outPath)) { console.log('lib/impact.json is missing'); process.exit(1); }
  const strip = d => JSON.stringify({ ...d, generated: undefined });
  const onDisk = JSON.parse(readFileSync(outPath, 'utf8'));
  if (strip(onDisk) !== strip(data)) {
    const all = d => new Map(d.panels.flatMap(p => p.series.map(s => [s.id, JSON.stringify(s)])));
    const [was, now] = [all(onDisk), all(data)];
    for (const id of new Set([...was.keys(), ...now.keys()])) if (was.get(id) !== now.get(id)) console.log(`differs: ${id}`);
    console.log('lib/impact.json is out of date: run node scripts/impact-data.mjs');
    process.exit(1);
  }
  console.log('lib/impact.json matches disk and git');
} else {
  writeFileSync(outPath, json);
  const count = data.panels.reduce((n, p) => n + p.series.length, 0);
  console.log(`wrote lib/impact.json: ${data.panels.length} panels, ${count} series, ${Buffer.byteLength(json)} bytes`);
}
